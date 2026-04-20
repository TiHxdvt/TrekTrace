-- TrekTrace 初始数据库 schema
-- V1__init_schema.sql

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    account BIGINT UNIQUE,
    phone VARCHAR(11) NOT NULL UNIQUE,
    nickname VARCHAR(50),
    avatar_url VARCHAR(512),
    password VARCHAR(255),
    nickname_updated_at DATETIME,
    data_visibility ENUM('PUBLIC','FRIENDS','PRIVATE') NOT NULL DEFAULT 'FRIENDS',
    status ENUM('ACTIVE','DELETED') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME,
    updated_at DATETIME
);

-- 运动记录表
CREATE TABLE IF NOT EXISTS activities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type ENUM('HIKING','RUNNING','CYCLING') NOT NULL,
    start_time DATETIME,
    end_time DATETIME,
    duration INT,
    distance DECIMAL(10,2),
    elevation_gain DECIMAL(10,2),
    status ENUM('ONGOING','PAUSED','COMPLETED') NOT NULL,
    created_at DATETIME,
    updated_at DATETIME,
    INDEX idx_activities_user_id (user_id),
    INDEX idx_activities_start_time (start_time)
);

-- 轨迹点表
CREATE TABLE IF NOT EXISTS track_points (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    activity_id BIGINT NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    altitude DECIMAL(8,2),
    speed DECIMAL(5,2),
    timestamp DATETIME NOT NULL,
    INDEX idx_track_points_activity_id (activity_id)
);

-- 验证码表
CREATE TABLE IF NOT EXISTS verification_codes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(11) NOT NULL,
    code VARCHAR(6) NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME,
    INDEX idx_vc_phone (phone)
);

-- 会话表
CREATE TABLE IF NOT EXISTS conversations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('DIRECT') NOT NULL,
    name VARCHAR(100),
    created_at DATETIME,
    updated_at DATETIME
);

-- 会话参与者表
CREATE TABLE IF NOT EXISTS conversation_participants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    last_read_message_id BIGINT,
    joined_at DATETIME,
    UNIQUE CONSTRAINT uq_cp_conv_user (conversation_id, user_id),
    INDEX idx_cp_conversation_id (conversation_id),
    INDEX idx_cp_user_id (user_id)
);

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    content TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
    media_url VARCHAR(512),
    media_type VARCHAR(20),
    media_size BIGINT,
    latitude DOUBLE,
    longitude DOUBLE,
    created_at DATETIME,
    INDEX idx_messages_conversation_id (conversation_id),
    INDEX idx_messages_sender_id (sender_id)
);

-- 好友关系表
CREATE TABLE IF NOT EXISTS friendships (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    requester_id BIGINT NOT NULL,
    addressee_id BIGINT NOT NULL,
    status ENUM('PENDING','ACCEPTED','DECLINED','BLOCKED') NOT NULL,
    created_at DATETIME,
    updated_at DATETIME,
    UNIQUE CONSTRAINT uq_fs_requester_addressee (requester_id, addressee_id),
    INDEX idx_friendship_addressee (addressee_id),
    INDEX idx_friendship_status (status)
);

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type ENUM('SYSTEM_UPDATE','ACTIVITY_SUMMARY','MILESTONE','FRIEND_REQUEST') NOT NULL,
    title VARCHAR(100),
    content TEXT,
    is_read BOOLEAN,
    related_id BIGINT,
    created_at DATETIME,
    INDEX idx_notifications_user_id (user_id),
    INDEX idx_notifications_user_read (user_id, is_read)
);
