use dashmap::DashSet;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

pub struct CrashRegistry {
    blacklisted_hashes: DashSet<u64>,
}

impl CrashRegistry {
    pub fn new() -> Self {
        Self {
            blacklisted_hashes: DashSet::new(),
        }
    }

    pub fn report_crash(&self, dna: &str) {
        let hash = self.calculate_hash(dna);
        self.blacklisted_hashes.insert(hash);
    }

    pub fn is_blacklisted(&self, dna: &str) -> bool {
        let hash = self.calculate_hash(dna);
        self.blacklisted_hashes.contains(&hash)
    }

    fn calculate_hash(&self, dna: &str) -> u64 {
        let mut s = DefaultHasher::new();
        dna.hash(&mut s);
        s.finish()
    }
}
