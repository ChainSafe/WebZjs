// Copyright 2024 ChainSafe Systems
// SPDX-License-Identifier: Apache-2.0, MIT

//! Validation utilities for wallet parameters.
//!
//! This module provides validation functions for wallet configuration parameters,
//! particularly around the ConfirmationsPolicy which controls how many block
//! confirmations are required before funds are considered spendable.

use std::num::NonZeroU32;
use zcash_client_backend::data_api::wallet::ConfirmationsPolicy;

/// Error types for validation failures.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ValidationError {
    /// The trusted confirmations value must be greater than zero.
    TrustedConfirmationsZero,
    /// The untrusted confirmations value must be greater than zero.
    UntrustedConfirmationsZero,
    /// Failed to create ConfirmationsPolicy (e.g., trusted > untrusted when required).
    InvalidConfirmationsPolicy,
}

impl std::fmt::Display for ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ValidationError::TrustedConfirmationsZero => {
                write!(f, "Trusted confirmations must be greater than 0")
            }
            ValidationError::UntrustedConfirmationsZero => {
                write!(f, "Untrusted confirmations must be greater than 0")
            }
            ValidationError::InvalidConfirmationsPolicy => {
                write!(f, "Invalid confirmations policy configuration")
            }
        }
    }
}

impl std::error::Error for ValidationError {}

/// Validates and creates a ConfirmationsPolicy from raw u32 values.
///
/// # Arguments
///
/// * `trusted` - Number of confirmations for change from own transactions (must be > 0)
/// * `untrusted` - Number of confirmations for received funds from others (must be > 0)
/// * `allow_mempool` - Whether to consider unconfirmed transactions in balance calculations
///
/// # Returns
///
/// A valid `ConfirmationsPolicy` or a `ValidationError` if the inputs are invalid.
///
/// # Security Considerations
///
/// - **Trusted confirmations**: Lower values (e.g., 1) are acceptable for change outputs
///   since they originate from the wallet itself and cannot be double-spent by others.
/// - **Untrusted confirmations**: Higher values (e.g., 10+) provide protection against
///   blockchain reorganizations that could reverse incoming transactions.
/// - **Constraint**: `trusted` must be less than or equal to `untrusted`. This enforces
///   the security invariant that you should not trust external funds less than your own
///   change outputs.
///
/// # Examples
///
/// ```
/// use webzjs_wallet::validation::validate_confirmations_policy;
///
/// // Typical configuration: trust own change quickly, wait longer for external funds
/// let policy = validate_confirmations_policy(1, 10, true).unwrap();
///
/// // Conservative configuration: wait for confirmations on everything
/// let policy = validate_confirmations_policy(3, 10, false).unwrap();
/// ```
pub fn validate_confirmations_policy(
    trusted: u32,
    untrusted: u32,
    allow_mempool: bool,
) -> Result<ConfirmationsPolicy, ValidationError> {
    let trusted_nonzero =
        NonZeroU32::try_from(trusted).map_err(|_| ValidationError::TrustedConfirmationsZero)?;

    let untrusted_nonzero =
        NonZeroU32::try_from(untrusted).map_err(|_| ValidationError::UntrustedConfirmationsZero)?;

    ConfirmationsPolicy::new(trusted_nonzero, untrusted_nonzero, allow_mempool)
        .map_err(|_| ValidationError::InvalidConfirmationsPolicy)
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== Valid Input Tests ====================

    #[test]
    fn test_valid_minimum_confirmations() {
        // Both set to minimum valid value (1)
        let result = validate_confirmations_policy(1, 1, true);
        assert!(
            result.is_ok(),
            "Minimum valid confirmations (1, 1) should succeed"
        );
    }

    #[test]
    fn test_valid_typical_configuration() {
        // Typical real-world configuration
        let result = validate_confirmations_policy(1, 10, true);
        assert!(
            result.is_ok(),
            "Typical configuration (1, 10) should succeed"
        );
    }

    #[test]
    fn test_valid_conservative_configuration() {
        // Conservative configuration with higher trusted confirmations
        let result = validate_confirmations_policy(3, 10, false);
        assert!(
            result.is_ok(),
            "Conservative configuration (3, 10) should succeed"
        );
    }

    #[test]
    fn test_valid_equal_confirmations() {
        // Equal trusted and untrusted values
        let result = validate_confirmations_policy(5, 5, true);
        assert!(result.is_ok(), "Equal confirmations (5, 5) should succeed");
    }

    #[test]
    fn test_valid_high_confirmations() {
        // Very high confirmation counts (paranoid configuration)
        let result = validate_confirmations_policy(100, 1000, true);
        assert!(
            result.is_ok(),
            "High confirmations (100, 1000) should succeed"
        );
    }

    #[test]
    fn test_valid_maximum_u32_values() {
        // Maximum u32 values (edge case)
        let result = validate_confirmations_policy(u32::MAX, u32::MAX, true);
        assert!(result.is_ok(), "Maximum u32 values should succeed");
    }

    #[test]
    fn test_valid_allow_mempool_false() {
        // Test with mempool disabled
        let result = validate_confirmations_policy(1, 1, false);
        assert!(result.is_ok(), "allow_mempool=false should succeed");
    }

    // ==================== Invalid Input Tests ====================

    #[test]
    fn test_invalid_zero_trusted() {
        let result = validate_confirmations_policy(0, 10, true);
        assert!(result.is_err(), "Zero trusted confirmations should fail");
        assert_eq!(
            result.unwrap_err(),
            ValidationError::TrustedConfirmationsZero,
            "Should return TrustedConfirmationsZero error"
        );
    }

    #[test]
    fn test_invalid_zero_untrusted() {
        let result = validate_confirmations_policy(10, 0, true);
        assert!(result.is_err(), "Zero untrusted confirmations should fail");
        assert_eq!(
            result.unwrap_err(),
            ValidationError::UntrustedConfirmationsZero,
            "Should return UntrustedConfirmationsZero error"
        );
    }

    #[test]
    fn test_invalid_both_zero() {
        let result = validate_confirmations_policy(0, 0, true);
        assert!(result.is_err(), "Both zero confirmations should fail");
        // Should fail on trusted first since it's validated first
        assert_eq!(
            result.unwrap_err(),
            ValidationError::TrustedConfirmationsZero,
            "Should return TrustedConfirmationsZero error (validated first)"
        );
    }

    #[test]
    fn test_invalid_zero_with_mempool_disabled() {
        // Even with mempool disabled, zero values should be rejected
        let result = validate_confirmations_policy(0, 1, false);
        assert!(
            result.is_err(),
            "Zero trusted with mempool disabled should fail"
        );
    }

    // ==================== Error Message Tests ====================

    #[test]
    fn test_error_display_trusted_zero() {
        let err = ValidationError::TrustedConfirmationsZero;
        assert_eq!(
            err.to_string(),
            "Trusted confirmations must be greater than 0"
        );
    }

    #[test]
    fn test_error_display_untrusted_zero() {
        let err = ValidationError::UntrustedConfirmationsZero;
        assert_eq!(
            err.to_string(),
            "Untrusted confirmations must be greater than 0"
        );
    }

    #[test]
    fn test_error_display_invalid_policy() {
        let err = ValidationError::InvalidConfirmationsPolicy;
        assert_eq!(
            err.to_string(),
            "Invalid confirmations policy configuration"
        );
    }

    // ==================== Edge Case Tests ====================

    #[test]
    fn test_trusted_greater_than_untrusted_is_invalid() {
        // ConfirmationsPolicy enforces that trusted <= untrusted
        // This makes security sense: you shouldn't trust external funds
        // less than your own change outputs
        let result = validate_confirmations_policy(10, 1, true);
        assert!(
            result.is_err(),
            "Trusted > untrusted should fail (security constraint)"
        );
        assert_eq!(
            result.unwrap_err(),
            ValidationError::InvalidConfirmationsPolicy,
            "Should return InvalidConfirmationsPolicy when trusted > untrusted"
        );
    }

    #[test]
    fn test_trusted_equal_to_untrusted_is_valid() {
        // Equal values should be allowed
        let result = validate_confirmations_policy(5, 5, true);
        assert!(result.is_ok(), "Trusted == untrusted should succeed");
    }

    #[test]
    fn test_trusted_less_than_untrusted_is_valid() {
        // Standard configuration: trust own change more than external funds
        let result = validate_confirmations_policy(1, 10, true);
        assert!(result.is_ok(), "Trusted < untrusted should succeed");
    }

    #[test]
    fn test_boundary_value_one() {
        // Test boundary: 1 is the minimum valid value
        let result = validate_confirmations_policy(1, 1, true);
        assert!(result.is_ok());

        // Confirm that the policy was actually created
        let policy = result.unwrap();
        assert_eq!(policy.trusted().get(), 1);
    }

    // ==================== Security-Relevant Tests ====================

    #[test]
    fn test_security_minimum_untrusted_for_exchanges() {
        // Exchanges typically require 10+ confirmations for deposits
        // This test documents the recommended minimum for high-security use cases
        let result = validate_confirmations_policy(1, 10, false);
        assert!(
            result.is_ok(),
            "Exchange-grade configuration should succeed"
        );
    }

    #[test]
    fn test_security_paranoid_configuration() {
        // Maximum security: high confirmations, no mempool
        let result = validate_confirmations_policy(6, 100, false);
        assert!(result.is_ok(), "Paranoid configuration should succeed");
    }
}
