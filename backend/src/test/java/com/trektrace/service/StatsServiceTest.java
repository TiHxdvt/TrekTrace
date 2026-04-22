package com.trektrace.service;

import com.trektrace.dto.StatsSummaryResponse;
import com.trektrace.dto.StatsSummaryResponse.PersonalRecords;
import com.trektrace.entity.Activity;
import com.trektrace.entity.User;
import com.trektrace.repository.ActivityRepository;
import com.trektrace.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StatsServiceTest {

    @Mock private ActivityRepository activityRepository;
    @Mock private UserRepository userRepository;

    private StatsService statsService;

    @BeforeEach
    void setUp() {
        statsService = new StatsService(activityRepository, userRepository);
    }

    private User makeUser(Long id, BigDecimal weight) {
        User u = new User();
        u.setId(id);
        u.setWeight(weight);
        return u;
    }

    private Activity makeActivity(Long id, Activity.ActivityType type, LocalDateTime start,
                                  BigDecimal distance, Integer duration, BigDecimal elevation) {
        Activity a = new Activity();
        a.setId(id);
        a.setType(type);
        a.setStartTime(start);
        a.setDistance(distance);
        a.setDuration(duration);
        a.setElevationGain(elevation);
        a.setStatus(Activity.ActivityStatus.COMPLETED);
        return a;
    }

    @Test
    void getSummary_noActivities_returnsZeroes() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(makeUser(1L, null)));
        when(activityRepository.findAllCompletedByUserId(1L)).thenReturn(List.of());

        StatsSummaryResponse r = statsService.getSummary(1L);

        assertEquals(0, r.getTotalActivities());
        assertEquals(BigDecimal.ZERO, r.getTotalDistance());
        assertEquals(0, r.getEstimatedCalories());
        assertTrue(r.getByType().isEmpty());
        assertTrue(r.getPersonalRecords().isEmpty());
    }

    @Test
    void getSummary_withActivities_aggregatesCorrectly() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(makeUser(1L, null)));
        LocalDateTime t1 = LocalDateTime.of(2025, 6, 1, 8, 0);
        LocalDateTime t2 = LocalDateTime.of(2025, 6, 2, 9, 0);
        List<Activity> acts = List.of(
                makeActivity(1L, Activity.ActivityType.HIKING, t1, new BigDecimal("5000"), 3600, new BigDecimal("100")),
                makeActivity(2L, Activity.ActivityType.RUNNING, t2, new BigDecimal("3000"), 1800, new BigDecimal("50"))
        );
        when(activityRepository.findAllCompletedByUserId(1L)).thenReturn(acts);
        when(activityRepository.findAllActiveDates(1L)).thenReturn(List.of(
                LocalDate.of(2025, 6, 1), LocalDate.of(2025, 6, 2)
        ));

        StatsSummaryResponse r = statsService.getSummary(1L);

        assertEquals(2, r.getTotalActivities());
        assertEquals(0, new BigDecimal("8000").compareTo(r.getTotalDistance()));
        assertEquals(5400L, r.getTotalDuration());
        assertNotNull(r.getByType().get("HIKING"));
        assertNotNull(r.getByType().get("RUNNING"));
        assertEquals(1, r.getByType().get("HIKING").getCount());
        assertEquals(2, r.getLongestStreak());
    }

    @Test
    void getSummary_weightAffectsCalories() {
        // Light user
        when(userRepository.findById(1L)).thenReturn(Optional.of(makeUser(1L, new BigDecimal("50"))));
        when(activityRepository.findAllCompletedByUserId(1L)).thenReturn(List.of(
                makeActivity(1L, Activity.ActivityType.RUNNING, LocalDateTime.now(), new BigDecimal("5000"), 1800, BigDecimal.ZERO)
        ));
        when(activityRepository.findAllActiveDates(1L)).thenReturn(List.of(LocalDate.now()));
        int calLight = statsService.getSummary(1L).getEstimatedCalories();

        // Heavy user with same activity
        when(userRepository.findById(2L)).thenReturn(Optional.of(makeUser(2L, new BigDecimal("100"))));
        when(activityRepository.findAllCompletedByUserId(2L)).thenReturn(List.of(
                makeActivity(2L, Activity.ActivityType.RUNNING, LocalDateTime.now(), new BigDecimal("5000"), 1800, BigDecimal.ZERO)
        ));
        when(activityRepository.findAllActiveDates(2L)).thenReturn(List.of(LocalDate.now()));
        int calHeavy = statsService.getSummary(2L).getEstimatedCalories();

        assertTrue(calHeavy > calLight, "Heavier user should burn more calories");
    }

    @Test
    void getSummary_personalRecords_findsBest() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(makeUser(1L, null)));
        LocalDateTime t1 = LocalDateTime.of(2025, 6, 1, 8, 0);
        LocalDateTime t2 = LocalDateTime.of(2025, 6, 15, 8, 0);
        List<Activity> acts = List.of(
                makeActivity(1L, Activity.ActivityType.RUNNING, t1, new BigDecimal("5000"), 1800, new BigDecimal("50")),
                makeActivity(2L, Activity.ActivityType.RUNNING, t2, new BigDecimal("10000"), 3600, new BigDecimal("200"))
        );
        when(activityRepository.findAllCompletedByUserId(1L)).thenReturn(acts);
        when(activityRepository.findAllActiveDates(1L)).thenReturn(List.of(
                LocalDate.of(2025, 6, 1), LocalDate.of(2025, 6, 15)
        ));

        StatsSummaryResponse r = statsService.getSummary(1L);
        PersonalRecords pr = r.getPersonalRecords().get("RUNNING");

        assertNotNull(pr);
        assertEquals(0, new BigDecimal("10000").compareTo(pr.getLongestDistance().getValue()));
        assertEquals("2025-06-15", pr.getLongestDistance().getDate());
        assertEquals(0, new BigDecimal("200").compareTo(pr.getHighestElevation().getValue()));
        assertNotNull(pr.getFastestPace());
    }

    @Test
    void getSummary_streakCalculation() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(makeUser(1L, null)));
        when(activityRepository.findAllCompletedByUserId(1L)).thenReturn(List.of(
                makeActivity(1L, Activity.ActivityType.HIKING, LocalDateTime.now(), new BigDecimal("1000"), 600, BigDecimal.ZERO)
        ));

        // Today in the active dates → current streak = 1
        when(activityRepository.findAllActiveDates(1L)).thenReturn(List.of(LocalDate.now()));

        StatsSummaryResponse r = statsService.getSummary(1L);
        assertEquals(1, r.getCurrentStreak());
        assertEquals(1, r.getLongestStreak());
    }

    @Test
    void getSummary_defaultWeightUsedWhenNull() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(makeUser(1L, null)));
        when(activityRepository.findAllCompletedByUserId(1L)).thenReturn(List.of(
                makeActivity(1L, Activity.ActivityType.HIKING, LocalDateTime.now(), new BigDecimal("3000"), 3600, BigDecimal.ZERO)
        ));
        when(activityRepository.findAllActiveDates(1L)).thenReturn(List.of(LocalDate.now()));

        StatsSummaryResponse r = statsService.getSummary(1L);
        // Should compute with default 70kg — calories > 0
        assertTrue(r.getEstimatedCalories() > 0);
        assertNull(r.getWeight());
    }
}
