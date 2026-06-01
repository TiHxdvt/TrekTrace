package com.trektrace.service;

import com.trektrace.dto.NearbyUserDTO;
import com.trektrace.entity.Activity;
import com.trektrace.entity.Friendship;
import com.trektrace.entity.User;
import com.trektrace.repository.ActivityRepository;
import com.trektrace.repository.FriendshipRepository;
import com.trektrace.repository.UserRepository;
import com.trektrace.repository.VerificationCodeRepository;
import com.trektrace.util.JwtUtil;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

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

    /** 密码强度正则：至少6位，必须包含字母和数字 */
    private static final Pattern PASSWORD_STRENGTH_PATTERN =
            Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@$!%*#?&]{6,72}$");

    /** 昵称最大字符长度（中英文均计为1） */
    private static final int NICKNAME_MAX_LENGTH = 14;

    /** 昵称修改冷却天数 */
    private static final long NICKNAME_COOLDOWN_DAYS = 7;

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^1[3-9]\\d{9}$");

    private static String generateRandomNickname() {
        String adj = ADJECTIVES[ThreadLocalRandom.current().nextInt(ADJECTIVES.length)];
        String noun = NOUNS[ThreadLocalRandom.current().nextInt(NOUNS.length)];
        return adj + noun;
    }

    private final UserRepository userRepository;
    private final VerificationCodeRepository verificationCodeRepository;
    private final JwtUtil jwtUtil;
    private final TokenBlacklistService tokenBlacklistService;
    private final FriendshipRepository friendshipRepository;
    private final ActivityRepository activityRepository;
    private static final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private static final double EARTH_RADIUS_KM = 6371.0;

    public UserService(UserRepository userRepository, VerificationCodeRepository verificationCodeRepository,
                       JwtUtil jwtUtil, TokenBlacklistService tokenBlacklistService,
                       FriendshipRepository friendshipRepository, ActivityRepository activityRepository) {
        this.userRepository = userRepository;
        this.verificationCodeRepository = verificationCodeRepository;
        this.jwtUtil = jwtUtil;
        this.tokenBlacklistService = tokenBlacklistService;
        this.friendshipRepository = friendshipRepository;
        this.activityRepository = activityRepository;
    }

    /** 判断 identifier 是否为邮箱格式 */
    public static boolean isEmail(String identifier) {
        return EMAIL_PATTERN.matcher(identifier).matches();
    }

    /** 判断 identifier 是否为手机号格式 */
    public static boolean isPhone(String identifier) {
        return PHONE_PATTERN.matcher(identifier).matches();
    }

    /** 注册新用户 */
    public User registerUser(String identifier, String rawPassword) {
        // 检查唯一性
        if (userRepository.findByIdentifier(identifier).isPresent()) {
            String msg = isEmail(identifier) ? "该邮箱已被注册" : "该手机号已被注册";
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
        }

        User newUser = new User();
        if (isEmail(identifier)) {
            newUser.setEmail(identifier);
            newUser.setEmailVerified(true);
        } else if (isPhone(identifier)) {
            newUser.setPhone(identifier);
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请输入正确的邮箱或手机号");
        }
        newUser.setNickname(generateRandomNickname());
        newUser.setAvatarUrl("https://api.dicebear.com/9.x/thumbs/png?seed=" + identifier);
        newUser.setPassword(passwordEncoder.encode(rawPassword));
        User saved = userRepository.save(newUser);
        saved.setAccount(100000L + saved.getId());
        return userRepository.save(saved);
    }

    public String generateToken(Long userId) {
        User user = getUserById(userId);
        return jwtUtil.generateAccessToken(userId, user.getPasswordVersion() != null ? user.getPasswordVersion() : 1);
    }

    public String generateRefreshToken(Long userId) {
        return jwtUtil.generateRefreshToken(userId);
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

    public User updateProfile(Long userId, String nickname, String avatarUrl, java.math.BigDecimal weight,
                               String bio, String gender, java.math.BigDecimal height) {
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
        if (weight != null) {
            user.setWeight(weight);
        }
        if (bio != null) {
            user.setBio(bio);
        }
        if (gender != null) {
            user.setGender(gender);
        }
        if (height != null) {
            user.setHeight(height);
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

    /** 根据 identifier（邮箱或手机号）+ 密码认证 */
    public User authenticatePassword(String identifier, String rawPassword) {
        User user = userRepository.findByIdentifier(identifier)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "账号或密码错误"));
        if (user.getPassword() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "账号或密码错误");
        }
        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "账号或密码错误");
        }
        return user;
    }

    public void setPassword(Long userId, String rawPassword) {
        User user = getUserById(userId);
        if (user.getPassword() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "密码已设置，请使用修改密码功能");
        }
        validatePasswordStrength(rawPassword);
        user.setPassword(passwordEncoder.encode(rawPassword));
        userRepository.save(user);
    }

    public void changePassword(Long userId, String oldPassword, String newPassword) {
        User user = getUserById(userId);
        if (user.getPassword() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "未设置密码，请先设置密码");
        }
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "当前密码错误");
        }
        validatePasswordStrength(newPassword);
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordVersion((user.getPasswordVersion() != null ? user.getPasswordVersion() : 1) + 1);
        userRepository.save(user);
    }

    /** 根据 identifier 重置密码 */
    public void resetPassword(String identifier, String code, String newPassword) {
        int consumed = verificationCodeRepository.consumeCode(identifier, code, LocalDateTime.now());
        if (consumed == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "验证码错误或已过期");
        }

        validatePasswordStrength(newPassword);

        User user = userRepository.findByIdentifier(identifier)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "用户不存在"));

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordVersion((user.getPasswordVersion() != null ? user.getPasswordVersion() : 1) + 1);
        userRepository.save(user);

        // Blacklist all refresh tokens for this user
        tokenBlacklistService.blacklistAllUserTokens(user.getId());
    }

    /** 绑定邮箱（验证码验证后直接绑定） */
    public void bindEmail(Long userId, String email, String code) {
        int consumed = verificationCodeRepository.consumeCode(email, code, LocalDateTime.now());
        if (consumed == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "验证码错误或已过期");
        }

        User user = getUserById(userId);
        // 检查邮箱是否已被其他用户绑定
        userRepository.findByEmail(email).ifPresent(existing -> {
            if (!existing.getId().equals(userId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "该邮箱已被其他用户绑定");
            }
        });
        user.setEmail(email);
        user.setEmailVerified(true);
        userRepository.save(user);
    }

    private void validatePasswordStrength(String password) {
        if (password == null || !PASSWORD_STRENGTH_PATTERN.matcher(password).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "密码需6-72位，且包含字母和数字");
        }
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

    /** Get nearby users within radiusKm */
    public List<NearbyUserDTO> getNearbyUsers(Long userId, double radiusKm) {
        User currentUser = getUserById(userId);
        if (currentUser.getLastLatitude() == null || currentUser.getLastLongitude() == null) {
            return Collections.emptyList();
        }

        double lat = currentUser.getLastLatitude().doubleValue();
        double lon = currentUser.getLastLongitude().doubleValue();

        // Calculate bounding box
        double latDelta = Math.toDegrees(radiusKm / EARTH_RADIUS_KM);
        double lonDelta = Math.toDegrees(radiusKm / (EARTH_RADIUS_KM * Math.cos(Math.toRadians(lat))));

        BigDecimal minLat = BigDecimal.valueOf(lat - latDelta);
        BigDecimal maxLat = BigDecimal.valueOf(lat + latDelta);
        BigDecimal minLon = BigDecimal.valueOf(lon - lonDelta);
        BigDecimal maxLon = BigDecimal.valueOf(lon + lonDelta);

        // Only show PUBLIC and FRIENDS visibility users, with location in last 7 days
        LocalDateTime recentCutoff = LocalDateTime.now().minusDays(7);
        List<User.DataVisibility> visibilities = List.of(
                User.DataVisibility.PUBLIC, User.DataVisibility.FRIENDS);

        List<User> candidates = userRepository.findNearbyUsers(
                minLat, maxLat, minLon, maxLon, recentCutoff, userId, visibilities);

        // Filter out blocked users
        Set<Long> blockedIds = friendshipRepository.findBlockedByUser(userId).stream()
                .flatMap(f -> java.util.stream.Stream.of(f.getRequesterId(), f.getAddresseeId()))
                .filter(id -> !id.equals(userId))
                .collect(Collectors.toSet());
        candidates = candidates.stream()
                .filter(u -> !blockedIds.contains(u.getId()))
                .collect(Collectors.toList());

        // Get latest activity for each nearby user
        List<Long> candidateIds = candidates.stream().map(User::getId).collect(Collectors.toList());
        Map<Long, Activity.ActivityType> lastActivityMap = new HashMap<>();
        if (!candidateIds.isEmpty()) {
            List<Activity> latestActivities = activityRepository.findLatestByUserIds(
                    candidateIds, PageRequest.of(0, 1000, Sort.by(Sort.Direction.DESC, "startTime")));
            for (Activity a : latestActivities) {
                lastActivityMap.putIfAbsent(a.getUserId(), a.getType());
            }
        }

        // Calculate precise distance and sort
        List<NearbyUserDTO> result = new ArrayList<>();
        for (User u : candidates) {
            double distance = haversineKm(lat, lon,
                    u.getLastLatitude().doubleValue(), u.getLastLongitude().doubleValue());
            if (distance <= radiusKm) {
                NearbyUserDTO dto = new NearbyUserDTO();
                dto.setUserId(u.getId());
                dto.setAccount(u.getAccount());
                dto.setNickname(u.getNickname());
                dto.setAvatarUrl(u.getAvatarUrl());
                dto.setDistanceKm(Math.round(distance * 10.0) / 10.0);
                Activity.ActivityType lastType = lastActivityMap.get(u.getId());
                dto.setLastActivityType(lastType != null ? lastType.name() : null);
                dto.setLastLocationAt(u.getLastLocationAt() != null ? u.getLastLocationAt().toString() : null);
                result.add(dto);
            }
        }

        result.sort(Comparator.comparingDouble(NearbyUserDTO::getDistanceKm));
        return result;
    }

    private static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_KM * c;
    }
}
