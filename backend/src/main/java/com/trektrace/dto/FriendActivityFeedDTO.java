package com.trektrace.dto;

import lombok.Data;

@Data
public class FriendActivityFeedDTO {
    private Long activityId;
    private Long userId;
    private String nickname;
    private String avatarUrl;
    private String activityType;
    private Double distance;
    private Integer duration;
    private String startTime;
}
