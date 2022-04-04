-- Adminer 4.8.0 MySQL 5.5.5-10.5.11-MariaDB-log dump

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

SET NAMES utf8mb4;

CREATE DATABASE `demo` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
USE `demo`;

DROP TABLE IF EXISTS `demo_history`;
CREATE TABLE `demo_history` (
  `demo_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `ip` varchar(45) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `time` int(10) unsigned NOT NULL DEFAULT 0,
  `time_sum` int(11) unsigned NOT NULL DEFAULT 0,
  `insert_time` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`demo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


DROP TABLE IF EXISTS `demo_user`;
CREATE TABLE `demo_user` (
  `user_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `organization` varchar(255) DEFAULT NULL,
  `position` varchar(64) DEFAULT NULL,
  `email` varchar(255) CHARACTER SET ascii NOT NULL,
  `phone` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `create_date` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 2021-09-03 06:13:06
