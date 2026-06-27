extern "C" __device__ float vgene_clamp(float value, float low, float high) {
    return fminf(fmaxf(value, low), high);
}

extern "C" __device__ float vgene_unit_noise(unsigned int value) {
    value ^= value >> 16;
    value *= 0x7feb352dU;
    value ^= value >> 15;
    value *= 0x846ca68bU;
    value ^= value >> 16;
    return (float)value / 4294967295.0f;
}

extern "C" __device__ float vgene_movement_step(int env_code) {
    if (env_code == 1) {
        return 0.08f;
    }
    if (env_code == 2) {
        return 0.35f;
    }
    return 0.20f;
}

extern "C" __global__ void ecology_step_kernel(
    int n,
    int env_code,
    float entropy_factor,
    unsigned int seed,
    const unsigned int* ids,
    const float* efficiency,
    float* x,
    float* y,
    float* z,
    float* score,
    float* energy,
    float* toxin
) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i >= n) {
        return;
    }

    float entropy_pressure = 0.5f + entropy_factor;
    float current_toxin = toxin[i];
    if (efficiency[i] < 0.3f) {
        current_toxin += 0.05f * entropy_pressure;
    } else {
        current_toxin -= 0.01f / fmaxf(entropy_pressure, 0.1f);
    }
    current_toxin = vgene_clamp(current_toxin, 0.0f, 1.0f);

    float current_energy = energy[i];
    current_energy -= 0.1f + current_toxin * (0.35f + entropy_factor);
    current_energy += fminf(score[i] / 50.0f, 0.5f);

    float movement_step = vgene_movement_step(env_code);
    unsigned int id = ids[i];
    float nx = vgene_unit_noise(seed ^ id * 747796405U ^ (unsigned int)i);
    float ny = vgene_unit_noise((seed + 0x9e3779b9U) ^ id * 289133645U ^ (unsigned int)i);
    float nz = vgene_unit_noise((seed + 0x85ebca6bU) ^ id * 1597334677U ^ (unsigned int)i);

    x[i] += (nx - 0.5f) * movement_step;
    y[i] += (ny - 0.5f) * movement_step;
    z[i] += (nz - 0.5f) * movement_step;

    if (current_energy <= 0.0f || current_toxin >= 1.0f) {
        score[i] = 0.0f;
    }

    energy[i] = vgene_clamp(current_energy, 0.0f, 100.0f);
    toxin[i] = current_toxin;
}

extern "C" __global__ void interaction_kernel(
    int n,
    const float* x,
    const float* y,
    const float* z,
    const int* attack,
    const int* defense,
    const float* altruism,
    const float* collaboration,
    float* energy,
    float* score
) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i >= n) {
        return;
    }

    float own_energy = energy[i];
    float own_score = score[i];

    for (int j = 0; j < n; ++j) {
        if (i == j) {
            continue;
        }

        float dx = x[i] - x[j];
        float dy = y[i] - y[j];
        float dz = z[i] - z[j];
        float dist_sq = dx * dx + dy * dy + dz * dz;
        if (dist_sq >= 0.25f) {
            continue;
        }

        if (altruism[i] > 0.7f && altruism[j] > 0.7f) {
            float affinity = 0.5f + 0.25f * (collaboration[i] + collaboration[j]);
            own_energy = own_energy * (1.0f - affinity) + energy[j] * affinity;
        } else if (attack[i] > defense[j] + 50) {
            own_energy = fminf(100.0f, own_energy + 20.0f);
            own_score += 1.0f;
        } else if (attack[j] > defense[i] + 50) {
            own_energy = 0.0f;
            own_score = 0.0f;
        }
    }

    energy[i] = vgene_clamp(own_energy, 0.0f, 100.0f);
    score[i] = fmaxf(0.0f, own_score);
}

extern "C" __global__ void selection_score_kernel(
    int n,
    int rule_code,
    const float* score,
    const float* energy,
    const int* attack,
    const int* dna_len,
    const float* fuel_efficiency,
    float* selection_score
) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i >= n) {
        return;
    }

    float selected = score[i] + energy[i] * 0.05f;
    if (rule_code == 1) {
        selected = score[i] + (float)attack[i] * 0.35f;
    } else if (rule_code == 2) {
        float size_penalty = fminf((float)dna_len[i] / 2000.0f, 40.0f);
        selected = score[i] + fuel_efficiency[i] * 10.0f - size_penalty;
    }

    selection_score[i] = selected;
}

extern "C" __global__ void world_stats_kernel(
    int n,
    const float* score,
    const float* energy,
    const float* toxin,
    const int* generation,
    float* stats
) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i >= n) {
        return;
    }

    atomicAdd(&stats[0], score[i]);
    atomicAdd(&stats[1], (float)generation[i]);
    atomicAdd(&stats[2], energy[i] > 0.0f && toxin[i] < 1.0f ? 1.0f : 0.0f);
    atomicAdd(&stats[3], toxin[i]);
}
