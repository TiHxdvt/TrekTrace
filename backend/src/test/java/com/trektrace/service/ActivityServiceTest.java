package com.trektrace.service;

import com.trektrace.dto.ActivityUploadRequest;
import com.trektrace.entity.Activity;
import com.trektrace.repository.ActivityRepository;
import com.trektrace.repository.FriendshipRepository;
import com.trektrace.repository.TrackPointRepository;
import com.trektrace.repository.UserRepository;
import com.trektrace.validation.TrackDataValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ActivityServiceTest {

    @Mock private ActivityRepository activityRepository;
    @Mock private TrackPointRepository trackPointRepository;
    @Mock private UserRepository userRepository;
    @Mock private FriendshipRepository friendshipRepository;
    @Mock private TrackDataValidator trackDataValidator;

    private ActivityService activityService;

    @BeforeEach
    void setUp() {
        activityService = new ActivityService(activityRepository, trackPointRepository, userRepository, friendshipRepository, trackDataValidator, new ObjectMapper());
    }

    @Test
    void getActivity_notFound_throws() {
        when(activityRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class,
                () -> activityService.getActivity(999L, 1L));
    }

    @Test
    void getActivity_wrongUser_throwsForbidden() {
        Activity activity = new Activity();
        activity.setId(1L);
        activity.setUserId(2L);
        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity));

        assertThrows(ResponseStatusException.class,
                () -> activityService.getActivity(1L, 1L));
    }

    @Test
    void uploadActivity_savesCorrectly() {
        ActivityUploadRequest request = new ActivityUploadRequest();
        request.setType("HIKING");
        request.setStartTime("2026-04-21T10:00:00");
        request.setEndTime("2026-04-21T12:00:00");
        request.setDuration(7200);
        request.setDistance(5.5);

        when(activityRepository.save(any(Activity.class))).thenAnswer(inv -> {
            Activity a = inv.getArgument(0);
            a.setId(1L);
            return a;
        });

        var result = activityService.uploadActivity(request, 1L);

        assertNotNull(result);
        verify(activityRepository).save(any(Activity.class));
    }

    @Test
    void deleteActivity_notOwner_throws() {
        Activity activity = new Activity();
        activity.setId(1L);
        activity.setUserId(2L);
        when(activityRepository.findById(1L)).thenReturn(Optional.of(activity));

        assertThrows(ResponseStatusException.class,
                () -> activityService.deleteActivity(1L, 1L));
        verify(activityRepository, never()).delete(any());
    }
}
