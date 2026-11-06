//! Sparse Order Maintenance for drag-and-drop category/account reordering.
//! Implements Bender/Cole/Demaine sparse allocation algorithm mimicking YNAB's `_p.relabelMinimumSparseEnclosingRange`
//! (`wrapper.beautified.js:59501–59625`).

pub const MIN_INDEX: i32 = -2147483648;
pub const MAX_INDEX: i32 = 2147483647;

/// Calculate midpoint index between two neighbors.
/// If there is at least one integer gap between `prev` and `next`, returns `(prev + next) / 2`.
/// Otherwise returns None, signaling that relabeling is required.
pub fn calculate_midpoint_index(prev: Option<i32>, next: Option<i32>) -> Option<i32> {
    match (prev, next) {
        (None, None) => Some(0),
        (None, Some(next_idx)) => {
            if next_idx > MIN_INDEX + 1000 {
                Some(next_idx - 1000)
            } else if next_idx > MIN_INDEX {
                Some(next_idx - 1)
            } else {
                None
            }
        }
        (Some(prev_idx), None) => {
            if prev_idx < MAX_INDEX - 1000 {
                Some(prev_idx + 1000)
            } else if prev_idx < MAX_INDEX {
                Some(prev_idx + 1)
            } else {
                None
            }
        }
        (Some(prev_idx), Some(next_idx)) => {
            if prev_idx >= next_idx {
                None
            } else {
                let diff = (next_idx as i64) - (prev_idx as i64);
                if diff > 1 {
                    Some((prev_idx as i64 + diff / 2) as i32)
                } else {
                    None
                }
            }
        }
    }
}

/// Relabel an array of items evenly across the given range [low, high].
pub fn evenly_space_indices(count: usize, low: i32, high: i32) -> Vec<i32> {
    if count == 0 {
        return Vec::new();
    }
    if count == 1 {
        return vec![(low as i64 + (high as i64 - low as i64) / 2) as i32];
    }
    let step = (high as i64 - low as i64) / (count as i64 + 1);
    (1..=count)
        .map(|i| (low as i64 + step * (i as i64)) as i32)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_midpoint_empty_or_open_ended() {
        assert_eq!(calculate_midpoint_index(None, None), Some(0));
        assert_eq!(calculate_midpoint_index(None, Some(2000)), Some(1000));
        assert_eq!(calculate_midpoint_index(Some(1000), None), Some(2000));
    }

    #[test]
    fn test_midpoint_with_gap() {
        assert_eq!(calculate_midpoint_index(Some(1000), Some(2000)), Some(1500));
        assert_eq!(calculate_midpoint_index(Some(10), Some(12)), Some(11));
    }

    #[test]
    fn test_midpoint_no_gap() {
        assert_eq!(calculate_midpoint_index(Some(10), Some(11)), None);
        assert_eq!(calculate_midpoint_index(Some(10), Some(10)), None);
    }
}
