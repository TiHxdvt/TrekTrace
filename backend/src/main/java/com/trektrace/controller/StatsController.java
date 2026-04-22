package com.trektrace.controller;

import com.trektrace.dto.StatsSummaryResponse;
import com.trektrace.service.StatsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping("/summary")
    public ResponseEntity<StatsSummaryResponse> getSummary(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(statsService.getSummary(userId));
    }

    @GetMapping("/week")
    public ResponseEntity<StatsSummaryResponse.TimePeriodSummary> getWeekSummary(
            @RequestParam(required = false) LocalDate date,
            Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        LocalDate ref = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(statsService.getWeekSummary(userId, ref));
    }

    @GetMapping("/month")
    public ResponseEntity<StatsSummaryResponse.TimePeriodSummary> getMonthSummary(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        LocalDate now = LocalDate.now();
        int y = year != null ? year : now.getYear();
        int m = month != null ? month : now.getMonthValue();
        if (m < 1 || m > 12 || y < 1900 || y > 2100) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(statsService.getMonthSummary(userId, y, m));
    }

    @GetMapping("/year")
    public ResponseEntity<StatsSummaryResponse.TimePeriodSummary> getYearSummary(
            @RequestParam(required = false) Integer year,
            Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        int y = year != null ? year : LocalDate.now().getYear();
        return ResponseEntity.ok(statsService.getYearSummary(userId, y));
    }
}
