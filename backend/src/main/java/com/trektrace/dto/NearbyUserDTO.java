package com.trektrace.dto;

import lombok.Data;

@Data
public class NearbyUserDTO {
    private Long userId;
    private Long account;
    private String nickname;
    private String avatarUrl;
    private Double distanceKm;
    private String lastActivityType;
    private String lastLocationAt;
}
