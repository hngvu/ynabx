package com.ynabx.exception;

public class TransactionLockedException extends RuntimeException {
    public TransactionLockedException(String message) {
        super(message);
    }
}
