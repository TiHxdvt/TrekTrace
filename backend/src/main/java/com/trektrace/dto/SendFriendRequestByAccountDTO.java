package com.trektrace.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SendFriendRequestByAccountDTO {
    @NotNull(message = "账号不能为空")
    private Long account;
}
