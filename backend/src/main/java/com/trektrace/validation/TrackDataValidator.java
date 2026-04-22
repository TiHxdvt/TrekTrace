package com.trektrace.validation;

import com.trektrace.dto.TrackPointDTO;
import com.trektrace.dto.TrackValidationResult;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.Duration;
import java.util.List;

@Component
public class TrackDataValidator {

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_DATE_TIME;
    private static final double MAX_SPEED_MS = 83.0; // m/s (~300 km/h, covers extreme sports)
    private static final double MIN_ALTITUDE = -500.0;
    private static final double MAX_ALTITUDE = 9000.0;

    public TrackValidationResult validate(
            List<TrackPointDTO> points,
            String startTimeStr,
            String endTimeStr,
            Integer duration,
            Double reportedDistance) {

        TrackValidationResult result = new TrackValidationResult();

        if (points == null || points.size() < 2) {
            result.addError("至少需要 2 个轨迹点");
            return result;
        }

        LocalDateTime startTime = parseDateTime(startTimeStr);
        LocalDateTime endTime = parseDateTime(endTimeStr);

        // Validate coordinate ranges and altitude
        for (int i = 0; i < points.size(); i++) {
            TrackPointDTO p = points.get(i);
            if (p.getLatitude() == null || p.getLongitude() == null) {
                result.addError("轨迹点 " + i + " 缺少坐标");
                continue;
            }
            if (p.getLatitude() < -90 || p.getLatitude() > 90) {
                result.addError("轨迹点 " + i + " 纬度超出范围: " + p.getLatitude());
            }
            if (p.getLongitude() < -180 || p.getLongitude() > 180) {
                result.addError("轨迹点 " + i + " 经度超出范围: " + p.getLongitude());
            }
            if (p.getAltitude() != null && (p.getAltitude() < MIN_ALTITUDE || p.getAltitude() > MAX_ALTITUDE)) {
                result.addWarning("轨迹点 " + i + " 海拔异常: " + p.getAltitude() + "m");
            }
        }

        // Validate timestamps are ascending and within activity time range
        LocalDateTime prevTs = null;
        for (int i = 0; i < points.size(); i++) {
            LocalDateTime ts = parseDateTime(points.get(i).getTimestamp());
            if (ts == null) {
                result.addError("轨迹点 " + i + " 时间戳无效");
                continue;
            }
            if (prevTs != null && ts.isBefore(prevTs)) {
                result.addError("轨迹点 " + i + " 时间戳非递增");
            }
            if (startTime != null && ts.isBefore(startTime)) {
                result.addWarning("轨迹点 " + i + " 时间早于活动开始时间");
            }
            if (endTime != null && ts.isAfter(endTime)) {
                result.addWarning("轨迹点 " + i + " 时间晚于活动结束时间");
            }
            prevTs = ts;
        }

        // Validate speed between consecutive points
        double computedDistance = 0;
        for (int i = 1; i < points.size(); i++) {
            TrackPointDTO p1 = points.get(i - 1);
            TrackPointDTO p2 = points.get(i);
            LocalDateTime t1 = parseDateTime(p1.getTimestamp());
            LocalDateTime t2 = parseDateTime(p2.getTimestamp());

            if (t1 != null && t2 != null
                    && p1.getLatitude() != null && p1.getLongitude() != null
                    && p2.getLatitude() != null && p2.getLongitude() != null) {
                double dist = haversine(p1.getLatitude(), p1.getLongitude(), p2.getLatitude(), p2.getLongitude());
                computedDistance += dist;
                double timeSec = Duration.between(t1, t2).toMillis() / 1000.0;
                if (timeSec > 0) {
                    double speed = dist / timeSec;
                    if (speed > MAX_SPEED_MS) {
                        result.addError("轨迹点 " + i + " 速度异常: " + String.format("%.1f", speed) + " m/s");
                    }
                }
            }
        }

        // Check reported distance vs computed distance (allow 2x tolerance)
        if (reportedDistance != null && reportedDistance > 0 && computedDistance > 0) {
            double ratio = reportedDistance / computedDistance;
            if (ratio > 2.0 || ratio < 0.5) {
                result.addWarning("报告距离(" + String.format("%.0f", reportedDistance) +
                        "m)与计算距离(" + String.format("%.0f", computedDistance) + "m)偏差较大");
            }
        }

        // Check duration consistency
        if (startTime != null && endTime != null && duration != null) {
            long actualSeconds = Duration.between(startTime, endTime).getSeconds();
            if (Math.abs(actualSeconds - duration) > 60) {
                result.addWarning("时长与起止时间差值不一致");
            }
        }

        return result;
    }

    private LocalDateTime parseDateTime(String value) {
        if (value == null || value.isEmpty()) return null;
        try {
            return LocalDateTime.parse(value, ISO_FORMATTER);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static final double EARTH_RADIUS = 6371000; // meters

    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS * c;
    }
}
