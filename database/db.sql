create table users (id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY, email varchar(65) NOT NULL, username varchar(45) NOT NULL, password varchar(255) NOT NULL, elo int(11) NOT NULL default 1200, session varchar(255) NOT NULL DEFAULT '');