package com.trektrace.config;

import com.trektrace.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataMigrationRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataMigrationRunner.class);

    private final UserRepository userRepository;

    public DataMigrationRunner(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        int fixed = userRepository.fixNullAccounts();
        if (fixed > 0) {
            log.info("已自动补齐 {} 个用户的 account 字段", fixed);
        }
    }
}
