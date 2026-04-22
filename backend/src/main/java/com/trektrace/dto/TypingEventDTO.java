package com.trektrace.dto;

import lombok.Data;

@Data
public class TypingEventDTO {
    private Long conversationId;
    private Long userId;
    private Boolean typing;
}
