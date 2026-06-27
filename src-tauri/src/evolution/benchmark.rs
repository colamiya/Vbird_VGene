use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum BenchmarkTaskId {
    Freeform,
    SortI32,
    Rle,
    SumI32,
    MaxI32,
    FindI32,
    Checksum8,
    CountByte,
}

#[derive(Debug, Clone, Serialize)]
pub struct BenchmarkTask {
    pub id: BenchmarkTaskId,
    pub name: &'static str,
    pub export_name: &'static str,
    pub goal: &'static str,
    pub public_cases: &'static [&'static str],
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreBreakdown {
    pub correctness: f32,
    pub fuel_efficiency: f32,
    pub size_score: f32,
    pub stability: f32,
    pub task_bonus: f32,
    pub final_score: f32,
}

pub const PHASE1_TASKS: &[BenchmarkTask] = &[
    BenchmarkTask {
        id: BenchmarkTaskId::Freeform,
        name: "freeform",
        export_name: "calculate_fitness",
        goal: "Baseline sandbox mode: DNA only needs to export calculate_fitness() -> i32.",
        public_cases: &[
            "calculate_fitness() returns a bounded score",
            "module validates under fuel and memory limits",
            "no task-specific export is required",
        ],
    },
    BenchmarkTask {
        id: BenchmarkTaskId::SortI32,
        name: "sort_i32",
        export_name: "sort_i32",
        goal: "Sort an i32 array in ascending order in exported wasm memory.",
        public_cases: &[
            "[3, 1, 2] -> [1, 2, 3]",
            "[0, -1, 8, 8] -> [-1, 0, 8, 8]",
            "[] -> []",
        ],
    },
    BenchmarkTask {
        id: BenchmarkTaskId::Rle,
        name: "rle",
        export_name: "rle_encode",
        goal: "Run-length encode byte input into exported wasm memory.",
        public_cases: &["aaabb -> a3b2", "abcd -> a1b1c1d1", "zzzzzz -> z6"],
    },
    BenchmarkTask {
        id: BenchmarkTaskId::SumI32,
        name: "sum_i32",
        export_name: "sum_i32",
        goal: "Sum a little-endian i32 array from exported wasm memory.",
        public_cases: &["[1, 2, 3] -> 6", "[-3, 5, 10] -> 12", "[] -> 0"],
    },
    BenchmarkTask {
        id: BenchmarkTaskId::MaxI32,
        name: "max_i32",
        export_name: "max_i32",
        goal: "Return the maximum i32 value from exported wasm memory.",
        public_cases: &["[3, 9, 1] -> 9", "[-8, -2, -30] -> -2", "[] -> 0"],
    },
    BenchmarkTask {
        id: BenchmarkTaskId::FindI32,
        name: "find_i32",
        export_name: "find_i32",
        goal: "Find the first index of a target i32 value in exported wasm memory.",
        public_cases: &["[4, 7, 7], target 7 -> 1", "[1, 2, 3], target 9 -> -1"],
    },
    BenchmarkTask {
        id: BenchmarkTaskId::Checksum8,
        name: "checksum8",
        export_name: "checksum8",
        goal: "Return an 8-bit byte checksum from exported wasm memory.",
        public_cases: &["[1,2,3] -> 6", "[250,10] -> 4", "[] -> 0"],
    },
    BenchmarkTask {
        id: BenchmarkTaskId::CountByte,
        name: "count_byte",
        export_name: "count_byte",
        goal: "Count occurrences of a byte value in exported wasm memory.",
        public_cases: &["banana, a -> 3", "aaaa, a -> 4", "abcd, z -> 0"],
    },
];

pub const PHASE1_PROMPT_CONTEXT: &str = r#"Phase 1 useful-work tasks:
- sort_i32(ptr, len) -> i32: sort little-endian i32 values in exported memory at ptr. Return 1 on success.
- rle_encode(in_ptr, in_len, out_ptr, out_cap) -> i32: encode input bytes as value/count pairs into output memory. Return written byte length, or -1 if output capacity is too small.
- sum_i32(ptr, len) -> i32: return the signed sum of i32 values.
- max_i32(ptr, len) -> i32: return the maximum i32 value, or 0 for empty input.
- find_i32(ptr, len, target) -> i32: return the first matching index, or -1.
- checksum8(ptr, len) -> i32: return the low 8 bits of the byte sum.
- count_byte(ptr, len, value) -> i32: return how many bytes equal value.
General rule: calculate_fitness() must remain exported and return an i32, but useful DNA should also expose one of the task exports above when possible.
Do not return a constant high score unless the task function is implemented."#;

pub const FREEFORM_BASELINE_DNA: &str = r#"(module
  (func (export "calculate_fitness") (result i32)
    i32.const 10
  )
)"#;

pub const SORT_I32_BASELINE_DNA: &str = r#"(module
  (memory (export "memory") 1)
  (func (export "calculate_fitness") (result i32)
    i32.const 20
  )
  (func (export "sort_i32") (param $ptr i32) (param $len i32) (result i32)
    (local $i i32)
    (local $j i32)
    (local $a i32)
    (local $b i32)
    (local $addr_a i32)
    (local $addr_b i32)

    i32.const 0
    local.set $i

    block $outer_exit
      loop $outer
        local.get $i
        local.get $len
        i32.ge_s
        br_if $outer_exit

        i32.const 0
        local.set $j

        block $inner_exit
          loop $inner
            local.get $j
            local.get $len
            i32.const 1
            i32.sub
            i32.ge_s
            br_if $inner_exit

            local.get $ptr
            local.get $j
            i32.const 4
            i32.mul
            i32.add
            local.set $addr_a

            local.get $addr_a
            i32.const 4
            i32.add
            local.set $addr_b

            local.get $addr_a
            i32.load
            local.set $a

            local.get $addr_b
            i32.load
            local.set $b

            local.get $a
            local.get $b
            i32.gt_s
            if
              local.get $addr_a
              local.get $b
              i32.store

              local.get $addr_b
              local.get $a
              i32.store
            end

            local.get $j
            i32.const 1
            i32.add
            local.set $j
            br $inner
          end
        end

        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $outer
      end
    end

    i32.const 1
  )
)"#;

pub const RLE_BASELINE_DNA: &str = r#"(module
  (memory (export "memory") 1)
  (func (export "calculate_fitness") (result i32)
    i32.const 20
  )
  (func (export "rle_encode") (param $in_ptr i32) (param $in_len i32) (param $out_ptr i32) (param $out_cap i32) (result i32)
    (local $i i32)
    (local $out_len i32)
    (local $current i32)
    (local $next i32)
    (local $count i32)

    local.get $in_len
    i32.eqz
    if
      i32.const 0
      return
    end

    local.get $out_cap
    i32.const 2
    i32.lt_s
    if
      i32.const -1
      return
    end

    local.get $in_ptr
    i32.load8_u
    local.set $current

    i32.const 1
    local.set $count

    i32.const 1
    local.set $i

    block $exit
      loop $scan
        local.get $i
        local.get $in_len
        i32.ge_s
        br_if $exit

        local.get $in_ptr
        local.get $i
        i32.add
        i32.load8_u
        local.set $next

        local.get $next
        local.get $current
        i32.eq
        local.get $count
        i32.const 255
        i32.lt_s
        i32.and
        if
          local.get $count
          i32.const 1
          i32.add
          local.set $count
        else
          local.get $out_len
          i32.const 2
          i32.add
          local.get $out_cap
          i32.gt_s
          if
            i32.const -1
            return
          end

          local.get $out_ptr
          local.get $out_len
          i32.add
          local.get $current
          i32.store8

          local.get $out_ptr
          local.get $out_len
          i32.add
          i32.const 1
          i32.add
          local.get $count
          i32.store8

          local.get $out_len
          i32.const 2
          i32.add
          local.set $out_len

          local.get $next
          local.set $current

          i32.const 1
          local.set $count
        end

        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $scan
      end
    end

    local.get $out_len
    i32.const 2
    i32.add
    local.get $out_cap
    i32.gt_s
    if
      i32.const -1
      return
    end

    local.get $out_ptr
    local.get $out_len
    i32.add
    local.get $current
    i32.store8

    local.get $out_ptr
    local.get $out_len
    i32.add
    i32.const 1
    i32.add
    local.get $count
    i32.store8

    local.get $out_len
    i32.const 2
    i32.add
  )
)"#;

pub const SUM_I32_BASELINE_DNA: &str = r#"(module
  (memory (export "memory") 1)
  (func (export "calculate_fitness") (result i32)
    i32.const 21
  )
  (func (export "sum_i32") (param $ptr i32) (param $len i32) (result i32)
    (local $i i32)
    (local $sum i32)
    block $exit
      loop $scan
        local.get $i
        local.get $len
        i32.ge_s
        br_if $exit

        local.get $sum
        local.get $ptr
        local.get $i
        i32.const 4
        i32.mul
        i32.add
        i32.load
        i32.add
        local.set $sum

        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $scan
      end
    end
    local.get $sum
  )
)"#;

pub const MAX_I32_BASELINE_DNA: &str = r#"(module
  (memory (export "memory") 1)
  (func (export "calculate_fitness") (result i32)
    i32.const 22
  )
  (func (export "max_i32") (param $ptr i32) (param $len i32) (result i32)
    (local $i i32)
    (local $max i32)
    (local $value i32)

    local.get $len
    i32.eqz
    if
      i32.const 0
      return
    end

    local.get $ptr
    i32.load
    local.set $max

    i32.const 1
    local.set $i

    block $exit
      loop $scan
        local.get $i
        local.get $len
        i32.ge_s
        br_if $exit

        local.get $ptr
        local.get $i
        i32.const 4
        i32.mul
        i32.add
        i32.load
        local.set $value

        local.get $value
        local.get $max
        i32.gt_s
        if
          local.get $value
          local.set $max
        end

        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $scan
      end
    end

    local.get $max
  )
)"#;

pub const FIND_I32_BASELINE_DNA: &str = r#"(module
  (memory (export "memory") 1)
  (func (export "calculate_fitness") (result i32)
    i32.const 23
  )
  (func (export "find_i32") (param $ptr i32) (param $len i32) (param $target i32) (result i32)
    (local $i i32)
    (local $value i32)

    block $exit
      loop $scan
        local.get $i
        local.get $len
        i32.ge_s
        br_if $exit

        local.get $ptr
        local.get $i
        i32.const 4
        i32.mul
        i32.add
        i32.load
        local.set $value

        local.get $value
        local.get $target
        i32.eq
        if
          local.get $i
          return
        end

        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $scan
      end
    end

    i32.const -1
  )
)"#;

pub const CHECKSUM8_BASELINE_DNA: &str = r#"(module
  (memory (export "memory") 1)
  (func (export "calculate_fitness") (result i32)
    i32.const 24
  )
  (func (export "checksum8") (param $ptr i32) (param $len i32) (result i32)
    (local $i i32)
    (local $sum i32)
    block $exit
      loop $scan
        local.get $i
        local.get $len
        i32.ge_s
        br_if $exit

        local.get $sum
        local.get $ptr
        local.get $i
        i32.add
        i32.load8_u
        i32.add
        local.set $sum

        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $scan
      end
    end

    local.get $sum
    i32.const 255
    i32.and
  )
)"#;

pub const COUNT_BYTE_BASELINE_DNA: &str = r#"(module
  (memory (export "memory") 1)
  (func (export "calculate_fitness") (result i32)
    i32.const 25
  )
  (func (export "count_byte") (param $ptr i32) (param $len i32) (param $value i32) (result i32)
    (local $i i32)
    (local $count i32)
    block $exit
      loop $scan
        local.get $i
        local.get $len
        i32.ge_s
        br_if $exit

        local.get $ptr
        local.get $i
        i32.add
        i32.load8_u
        local.get $value
        i32.const 255
        i32.and
        i32.eq
        if
          local.get $count
          i32.const 1
          i32.add
          local.set $count
        end

        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $scan
      end
    end

    local.get $count
  )
)"#;

pub fn baseline_dna_for_task(task_id: BenchmarkTaskId) -> &'static str {
    match task_id {
        BenchmarkTaskId::Freeform => FREEFORM_BASELINE_DNA,
        BenchmarkTaskId::SortI32 => SORT_I32_BASELINE_DNA,
        BenchmarkTaskId::Rle => RLE_BASELINE_DNA,
        BenchmarkTaskId::SumI32 => SUM_I32_BASELINE_DNA,
        BenchmarkTaskId::MaxI32 => MAX_I32_BASELINE_DNA,
        BenchmarkTaskId::FindI32 => FIND_I32_BASELINE_DNA,
        BenchmarkTaskId::Checksum8 => CHECKSUM8_BASELINE_DNA,
        BenchmarkTaskId::CountByte => COUNT_BYTE_BASELINE_DNA,
    }
}

pub fn phase1_task_catalog() -> Vec<BenchmarkTask> {
    PHASE1_TASKS.to_vec()
}

pub fn score_useful_work(
    passed_cases: usize,
    total_cases: usize,
    consumed_fuel: u64,
    fuel_budget: u64,
    wasm_bytes: usize,
    size_budget: usize,
    trap_count: usize,
    task_bonus: f32,
) -> ScoreBreakdown {
    if total_cases == 0 || passed_cases < total_cases || trap_count > 0 {
        return ScoreBreakdown {
            correctness: if total_cases == 0 {
                0.0
            } else {
                passed_cases as f32 / total_cases as f32
            },
            fuel_efficiency: 0.0,
            size_score: 0.0,
            stability: 0.0,
            task_bonus: 0.0,
            final_score: 0.0,
        };
    }

    let correctness = passed_cases as f32 / total_cases as f32;
    let fuel_efficiency = if fuel_budget == 0 {
        0.0
    } else {
        (1.0 - consumed_fuel as f32 / fuel_budget as f32).clamp(0.0, 1.0)
    };
    let size_score = if size_budget == 0 {
        0.0
    } else {
        (1.0 - wasm_bytes as f32 / size_budget as f32).clamp(0.0, 1.0)
    };
    let stability = 1.0;
    let weighted = 0.65 + 0.25 * fuel_efficiency + 0.10 * size_score + task_bonus.clamp(0.0, 0.25);

    ScoreBreakdown {
        correctness,
        fuel_efficiency,
        size_score,
        stability,
        task_bonus,
        final_score: 1000.0 * correctness.powi(3) * weighted * stability,
    }
}
