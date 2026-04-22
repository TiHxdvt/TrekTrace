package com.trektrace.util;

public final class PhoneUtils {

    private PhoneUtils() {}

    /**
     * Mask a phone number, showing only first 3 and last 4 digits.
     * Example: 13812345678 → 138****5678
     */
    public static String maskPhone(String phone) {
        if (phone != null && phone.length() >= 7) {
            return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
        }
        return phone;
    }
}
