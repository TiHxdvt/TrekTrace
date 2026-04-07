-- 途迹 TrekTrace 数据库设计
-- 创建时间: 2026-04-06

-- 用户表
CREATE table users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(11) UNIQUE NOT NULL,
    nickname VARCHAR(50),
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 运动记录表
create table activities (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    type ENUM('HIKING', 'RUNNING', 'CYCLING') NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration INT, -- 秒
    distance DECIMAL(10, 2), -- 米
    elevation_gain DECIMAL(10, 2), -- 爬升米
    status ENUM('ONGOING', 'PAUSED', 'COMPLETED') DEFAULT 'ONGOING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 轨迹点表
create table track_points (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    activity_id BIGINT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) not null,
    altitude DECIMAL(9, 2), -- 米
    timestamp TIMESTAMP NOT NULL,
    speed DECIMAL(5, 2), -- m/s
    FOREIGN key (activity_id) references activities(id)
);

-- 验证码表
create table verification_codes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(11) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
