package com.trektrace.service;

import com.trektrace.dto.StatsSummaryResponse;
import com.trektrace.dto.StatsSummaryResponse.PersonalRecords;
import com.trektrace.dto.StatsSummaryResponse.RecordEntry;
import com.trektrace.dto.StatsSummaryResponse.TypeSummary;
import com.trektrace.dto.StatsSummaryResponse.TimePeriodSummary;
import com.trektrace.dto.StatsSummaryResponse.TypeBreakdown;
import com.trektrace.entity.Activity;
import com.trektrace.entity.Activity.ActivityType;
import com.trektrace.entity.User;
import com.trektrace.repository.ActivityRepository;
import com.trektrace.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

@Service
public class StatsService {

    private static final double DEFAULT_WEIGHT = 70.0;
    private static final Map<String, Double> MET_VALUES = Map.of(
            "HIKING", 6.0,
            "RUNNING", 9.8,
            "CYCLING", 8.0
    );

    private final ActivityRepository activityRepository;
    private final UserRepository userRepository;

    public StatsService(ActivityRepository activityRepository, UserRepository userRepository) {
        this.activityRepository = activityRepository;
        this.userRepository = userRepository;
    }

    public StatsSummaryResponse getSummary(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        double weightKg = user.getWeight() != null ? user.getWeight().doubleValue() : DEFAULT_WEIGHT;

        StatsSummaryResponse response = new StatsSummaryResponse();
        response.setWeight(user.getWeight());

        long totalCount = activityRepository.countCompletedByUserId(userId);
        if (totalCount == 0) {
            response.setTotalActivities(0);
            response.setTotalDistance(BigDecimal.ZERO);
            response.setTotalDuration(0L);
            response.setTotalElevationGain(BigDecimal.ZERO);
            response.setEstimatedCalories(0);
            response.setByType(Map.of());
            response.setCurrentStreak(0);
            response.setLongestStreak(0);
            response.setPersonalRecords(Map.of());
            return response;
        }

        // Use DB aggregation for totals
        BigDecimal totalDistance = activityRepository.sumDistanceByUserId(userId);
        long totalDuration = activityRepository.sumDurationByUserId(userId);
        BigDecimal totalElevation = activityRepository.sumElevationGainByUserId(userId);

        response.setTotalActivities((int) totalCount);
        response.setTotalDistance(totalDistance);
        response.setTotalDuration(totalDuration);
        response.setTotalElevationGain(totalElevation);

        // Estimate total calories using aggregated values (approximation)
        int totalCalories = (int) Math.round(
            MET_VALUES.values().stream().mapToDouble(Double::doubleValue).average().orElse(6.0)
            * weightKg * (totalDuration / 3600.0)
        );
        response.setEstimatedCalories(totalCalories);

        // Per-type aggregation still needs loading, but only per type
        Map<String, TypeSummary> byType = new LinkedHashMap<>();
        Map<String, PersonalRecords> prMap = new LinkedHashMap<>();
        PageRequest topOne = PageRequest.of(0, 1);

        for (ActivityType type : ActivityType.values()) {
            String typeName = type.name();
            List<Activity> typeActivities = activityRepository.findAllCompletedByUserIdAndStartTimeBetween(
                    userId, LocalDateTime.of(2000, 1, 1, 0, 0), LocalDateTime.now());

            List<Activity> filtered = typeActivities.stream()
                    .filter(a -> a.getType() == type).toList();
            if (filtered.isEmpty()) continue;

            TypeSummary ts = new TypeSummary();
            ts.setCount(filtered.size());
            BigDecimal dist = BigDecimal.ZERO;
            long dur = 0;
            int cal = 0;
            for (Activity a : filtered) {
                BigDecimal d = a.getDistance() != null ? a.getDistance() : BigDecimal.ZERO;
                int du = a.getDuration() != null ? a.getDuration() : 0;
                BigDecimal el = a.getElevationGain() != null ? a.getElevationGain() : BigDecimal.ZERO;
                dist = dist.add(d);
                dur += du;
                cal += calculateCalories(typeName, du, el.doubleValue(), weightKg);
            }
            ts.setDistance(dist);
            ts.setDuration(dur);
            ts.setCalories(cal);
            byType.put(typeName, ts);

            // Personal records: query top 1 per metric
            PersonalRecords pr = new PersonalRecords();

            List<Activity> bestDist = activityRepository.findCompletedByUserIdAndTypeOrderByDistanceDesc(userId, type, topOne);
            if (!bestDist.isEmpty()) {
                Activity a = bestDist.get(0);
                pr.setLongestDistance(new RecordEntry(
                    a.getDistance() != null ? a.getDistance() : BigDecimal.ZERO,
                    formatDate(a)));
            }

            List<Activity> bestDur = activityRepository.findCompletedByUserIdAndTypeOrderByDurationDesc(userId, type, topOne);
            if (!bestDur.isEmpty()) {
                Activity a = bestDur.get(0);
                pr.setLongestDuration(new RecordEntry(
                    BigDecimal.valueOf(a.getDuration() != null ? a.getDuration() : 0),
                    formatDate(a)));
            }

            List<Activity> bestElev = activityRepository.findCompletedByUserIdAndTypeOrderByElevationDesc(userId, type, topOne);
            if (!bestElev.isEmpty()) {
                Activity a = bestElev.get(0);
                pr.setHighestElevation(new RecordEntry(
                    a.getElevationGain() != null ? a.getElevationGain() : BigDecimal.ZERO,
                    formatDate(a)));
            }

            // Fastest pace (RUNNING/CYCLING only)
            if (type == ActivityType.RUNNING || type == ActivityType.CYCLING) {
                List<Activity> fastest = activityRepository.findFastestPaceByUserIdAndTypes(
                        userId, List.of(type), topOne);
                if (!fastest.isEmpty()) {
                    Activity a = fastest.get(0);
                    BigDecimal d = a.getDistance() != null ? a.getDistance() : BigDecimal.ZERO;
                    int du = a.getDuration() != null ? a.getDuration() : 0;
                    if (d.doubleValue() > 0 && du > 0) {
                        BigDecimal paceKm = BigDecimal.valueOf(du)
                                .multiply(BigDecimal.valueOf(1000))
                                .divide(d, 2, RoundingMode.HALF_UP);
                        pr.setFastestPace(new RecordEntry(paceKm, formatDate(a)));
                    }
                }
            }

            prMap.put(typeName, pr);
        }

        response.setByType(byType);
        response.setPersonalRecords(prMap);

        // Streaks
        List<LocalDate> activeDates = activityRepository.findAllActiveDates(userId);
        int[] streaks = computeStreaks(activeDates);
        response.setCurrentStreak(streaks[0]);
        response.setLongestStreak(streaks[1]);

        return response;
    }

    private String formatDate(Activity a) {
        return a.getStartTime() != null
                ? a.getStartTime().toLocalDate().format(DateTimeFormatter.ISO_LOCAL_DATE)
                : null;
    }

    private int calculateCalories(String type, int durationSeconds, double elevationGain, double weightKg) {
        double met = MET_VALUES.getOrDefault(type, 6.0);
        double hours = durationSeconds / 3600.0;
        double climbBonus = elevationGain > 0 ? (elevationGain / 100) * 0.3 : 0;
        return (int) Math.round(met * weightKg * hours + climbBonus);
    }

    private int[] computeStreaks(List<LocalDate> dates) {
        if (dates.isEmpty()) return new int[]{0, 0};

        Set<LocalDate> dateSet = new HashSet<>(dates);

        // Dates are already sorted from query
        int longest = 1;
        int streak = 1;
        for (int i = 1; i < dates.size(); i++) {
            if (dates.get(i).minusDays(1).equals(dates.get(i - 1))) {
                streak++;
                longest = Math.max(longest, streak);
            } else {
                streak = 1;
            }
        }

        // Current streak: must include today or yesterday
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        int current = 0;
        if (dateSet.contains(today) || dateSet.contains(yesterday)) {
            LocalDate start = dateSet.contains(today) ? today : yesterday;
            current = 1;
            LocalDate prev = start.minusDays(1);
            while (dateSet.contains(prev)) {
                current++;
                prev = prev.minusDays(1);
            }
        }

        return new int[]{current, longest};
    }

    // ==================== 时间维度统计 ====================

    public TimePeriodSummary getWeekSummary(Long userId, LocalDate referenceDate) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        double weightKg = user.getWeight() != null ? user.getWeight().doubleValue() : DEFAULT_WEIGHT;

        LocalDate weekStart = referenceDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDateTime start = weekStart.atStartOfDay();
        LocalDateTime end = weekStart.plusWeeks(1).atStartOfDay();

        List<Activity> activities = activityRepository.findAllCompletedByUserIdAndStartTimeBetween(userId, start, end);
        return buildTimePeriodSummary(activities, weightKg);
    }

    public TimePeriodSummary getMonthSummary(Long userId, int year, int month) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        double weightKg = user.getWeight() != null ? user.getWeight().doubleValue() : DEFAULT_WEIGHT;

        LocalDateTime start = LocalDate.of(year, month, 1).atStartOfDay();
        LocalDateTime end = start.plusMonths(1);

        List<Activity> activities = activityRepository.findAllCompletedByUserIdAndStartTimeBetween(userId, start, end);
        return buildTimePeriodSummary(activities, weightKg);
    }

    public TimePeriodSummary getYearSummary(Long userId, int year) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        double weightKg = user.getWeight() != null ? user.getWeight().doubleValue() : DEFAULT_WEIGHT;

        LocalDateTime start = LocalDate.of(year, 1, 1).atStartOfDay();
        LocalDateTime end = LocalDate.of(year + 1, 1, 1).atStartOfDay();

        List<Activity> activities = activityRepository.findAllCompletedByUserIdAndStartTimeBetween(userId, start, end);
        return buildTimePeriodSummary(activities, weightKg);
    }

    private TimePeriodSummary buildTimePeriodSummary(List<Activity> activities, double weightKg) {
        TimePeriodSummary summary = new TimePeriodSummary();
        summary.setTotalActivities(activities.size());

        if (activities.isEmpty()) {
            summary.setActiveDays(0);
            summary.setTotalDistance(BigDecimal.ZERO);
            summary.setTotalDuration(0);
            summary.setTotalElevationGain(BigDecimal.ZERO);
            summary.setTotalCalories(0);
            summary.setByType(Map.of());
            return summary;
        }

        Set<LocalDate> activeDateSet = new HashSet<>();
        BigDecimal totalDistance = BigDecimal.ZERO;
        long totalDuration = 0;
        BigDecimal totalElevation = BigDecimal.ZERO;
        int totalCalories = 0;
        Map<String, TypeBreakdown> byType = new LinkedHashMap<>();

        for (Activity a : activities) {
            String type = a.getType().name();
            BigDecimal dist = a.getDistance() != null ? a.getDistance() : BigDecimal.ZERO;
            int dur = a.getDuration() != null ? a.getDuration() : 0;
            BigDecimal elev = a.getElevationGain() != null ? a.getElevationGain() : BigDecimal.ZERO;
            int cal = calculateCalories(type, dur, elev.doubleValue(), weightKg);

            if (a.getStartTime() != null) {
                activeDateSet.add(a.getStartTime().toLocalDate());
            }

            totalDistance = totalDistance.add(dist);
            totalDuration += dur;
            totalElevation = totalElevation.add(elev);
            totalCalories += cal;

            TypeBreakdown tb = byType.computeIfAbsent(type, k -> {
                TypeBreakdown b = new TypeBreakdown();
                b.setCount(0);
                b.setDistance(BigDecimal.ZERO);
                b.setDuration(0);
                return b;
            });
            tb.setCount(tb.getCount() + 1);
            tb.setDistance(tb.getDistance().add(dist));
            tb.setDuration(tb.getDuration() + dur);
        }

        summary.setActiveDays(activeDateSet.size());
        summary.setTotalDistance(totalDistance);
        summary.setTotalDuration(totalDuration);
        summary.setTotalElevationGain(totalElevation);
        summary.setTotalCalories(totalCalories);
        summary.setByType(byType);
        return summary;
    }
}
