package com.trektrace.service;

import com.trektrace.entity.User;
import com.trektrace.repository.UserRepository;
import com.trektrace.util.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Pattern;

@Service
public class UserService {

    private static final String[] ADJECTIVES = {
            "勇敢的", "快乐的", "自由的", "坚毅的", "热情的",
            "悠然的", "洒脱的", "沉稳的", "灵动的", "无畏的",
            "好奇的", "温暖的", "阳光的", "静谧的", "豪迈的",
            "率真的", "飒爽的", "从容的", "浪漫的", "温柔的",
            "乐观的", "淡定的", "坚定的", "睿智的", "谦逊的",
            "执着的", "纯真的", "豁达的", "机敏的", "果敢的",
            "细腻的", "坦荡的", "热烈的", "明朗的", "清澈的",
    };

    private static final String[] NOUNS = {
            "探险家", "旅人", "行者", "漫游者", "背包客",
            "追风者", "寻路人", "登山者", "骑行者", "徒步者",
            "观星者", "拾光人", "山野客", "清风客", "远行雁",
            "溪边鹿", "云间鹤", "林间风", "破晓鸟", "逐日者",
            "听雨人", "逐浪者", "牧云人", "踏雪客", "攀岩者",
            "望月者", "迎风客", "涉水人", "穿林者", "破冰客",
            "寻梦人", "追光者", "伴山人", "栖云客", "渡星者",
    };

    /** 允许中文、字母、数字、下划线、短横线、点 */
    private static final Pattern NICKNAME_PATTERN = Pattern.compile("^[\\u4e00-\\u9fa5a-zA-Z0-9_.\\-]+$");

    /** 昵称最大字符长度（中英文均计为1） */
    private static final int NICKNAME_MAX_LENGTH = 14;

    /** 昵称修改冷却天数 */
    private static final long NICKNAME_COOLDOWN_DAYS = 7;

    private static String generateRandomNickname() {
        String adj = ADJECTIVES[ThreadLocalRandom.current().nextInt(ADJECTIVES.length)];
        String noun = NOUNS[ThreadLocalRandom.current().nextInt(NOUNS.length)];
        return adj + noun;
    }

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    public UserService(UserRepository userRepository, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    public User createOrGetUser(String phone) {
        Optional<User> existingUser = userRepository.findByPhone(phone);

        if (existingUser.isPresent()) {
            return existingUser.get();
        }

        User newUser = new User();
        newUser.setPhone(phone);
        newUser.setNickname(generateRandomNickname());
        newUser.setAvatarUrl("https://api.dicebear.com/9.x/thumbs/png?seed=" + phone);
        return userRepository.save(newUser);
    }

    public String generateToken(Long userId) {
        return jwtUtil.generateToken(userId);
    }

    public User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "用户不存在"));
    }

    /** 计算昵称显示宽度（中文算2，其他算1） */
    private static int nicknameWidth(String s) {
        int w = 0;
        for (int i = 0; i < s.length(); i++) {
            w += s.charAt(i) > 0x7F ? 2 : 1;
        }
        return w;
    }

    public User updateProfile(Long userId, String nickname, String avatarUrl) {
        User user = getUserById(userId);
        if (nickname != null) {
            // 昵称长度校验（中文算2，英文/符号算1，上限14=7个中文）
            int width = nicknameWidth(nickname);
            if (width == 0 || width > NICKNAME_MAX_LENGTH) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "昵称最长7个中文或14个英文字符");
            }
            // 昵称字符校验
            if (!NICKNAME_PATTERN.matcher(nickname).matches()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "昵称只能包含中文、字母、数字、下划线、短横线或点");
            }
            // 冷却期校验（仅当用户主动改名时检查，首次设置随机名不检查）
            if (user.getNicknameUpdatedAt() != null) {
                LocalDateTime earliest = user.getNicknameUpdatedAt().plusDays(NICKNAME_COOLDOWN_DAYS);
                if (LocalDateTime.now().isBefore(earliest)) {
                    Duration remaining = Duration.between(LocalDateTime.now(), earliest);
                    long days = remaining.toDays();
                    long hours = remaining.minusDays(days).toHours();
                    String timeDesc;
                    if (days > 0) {
                        timeDesc = days + "天" + (hours > 0 ? hours + "小时" : "");
                    } else if (hours > 0) {
                        timeDesc = hours + "小时" + (remaining.minusHours(remaining.toHours()).toMinutes() % 60) + "分钟";
                    } else {
                        timeDesc = Math.max(1, remaining.toMinutes()) + "分钟";
                    }
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "昵称修改冷却中，还需等待" + timeDesc);
                }
            }
            user.setNickname(nickname);
            user.setNicknameUpdatedAt(LocalDateTime.now());
        }
        if (avatarUrl != null) {
            user.setAvatarUrl(avatarUrl);
        }
        return userRepository.save(user);
    }

    public void deleteUser(Long userId) {
        User user = getUserById(userId);
        user.setStatus(User.UserStatus.DELETED);
        userRepository.save(user);
    }

    public User changePhone(Long userId, String newPhone) {
        User user = getUserById(userId);
        if (userRepository.existsByPhone(newPhone)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "该手机号已被注册");
        }
        user.setPhone(newPhone);
        return userRepository.save(user);
    }

    public User updateVisibility(Long userId, String visibility) {
        User user = getUserById(userId);
        try {
            user.setDataVisibility(User.DataVisibility.valueOf(visibility));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "无效的可见性设置");
        }
        return userRepository.save(user);
    }
}
