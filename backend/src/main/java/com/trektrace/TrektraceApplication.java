package com.trektrace;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TrektraceApplication {

    public static void main(String[] args) {
        SpringApplication.run(TrektraceApplication.class, args);
    }
}
