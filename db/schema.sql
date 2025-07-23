-- Шаблон для добавления трека:
--
-- INSERT INTO tracks (title, artist, album, album_type, duration, file_path, cover)
-- VALUES ('Название', 'Артист', 'Альбом', 'single', 180, '/uploads/tracks/track.mp3', '/uploads/covers/cover.jpg');

-- Таблица треков с полной информацией
CREATE TABLE IF NOT EXISTS tracks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,           -- Название трека
    artist VARCHAR(255) NOT NULL,          -- Имя артиста
    album VARCHAR(255) NOT NULL,           -- Название альбома
    album_type ENUM('album', 'ep', 'single') NOT NULL DEFAULT 'album', -- Тип альбома
    duration INT,                          -- Длительность в секундах
    file_path VARCHAR(255) NOT NULL,       -- Путь к аудиофайлу
    cover VARCHAR(255),                    -- Путь к обложке
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track-Genre relation
CREATE TABLE track_genres (
    track_id INT,
    genre_id INT,
    PRIMARY KEY (track_id, genre_id),
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
);

-- Playlists
CREATE TABLE playlists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    name VARCHAR(255) NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Playlist-Tracks relation
CREATE TABLE playlist_tracks (
    playlist_id INT,
    track_id INT,
    position INT,
    PRIMARY KEY (playlist_id, track_id),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

-- Likes
CREATE TABLE likes (
    user_id INT,
    track_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, track_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

-- History
CREATE TABLE history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    track_id INT,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

-- Tags (optional, for advanced search/recommendations)
CREATE TABLE tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE track_tags (
    track_id INT,
    tag_id INT,
    PRIMARY KEY (track_id, tag_id),
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
); 

INSERT INTO tracks (title, artist, album, album_type, duration, file_path, cover)
-- тринадцать карат 13 причин почему
VALUES ('кассета 1', 'тринадцать карат', '13 причин почему', ' ', 180, 'tracks/music/trinadcat_karat_kasseta_1.mp3', 'tracks/covers/m1000x1000.jpeg'),
VALUES ('утонуть', 'тринадцать карат', '13 причин почему', ' ', 180, 'tracks/music/утонуть.mp3', 'tracks/covers/m1000x1000.jpeg'),
VALUES ('во снах', 'тринадцать карат', '13 причин почему', ' ', 180, 'tracks/music/во снах.mp3', 'tracks/covers/m1000x1000.jpeg'),
VALUES ('проваливай', 'тринадцать карат', '13 причин почему', ' ', 180, 'tracks/music/проваливай.mp3', 'tracks/covers/m1000x1000.jpeg'),
VALUES ('ты', 'тринадцать карат', '13 причин почему', ' ', 180, 'tracks/music/ты.mp3', 'tracks/covers/m1000x1000.jpeg'),
VALUES ('кассета 6', 'тринадцать карат', '13 причин почему', ' ', 180, 'tracks/music/кассета 6.mp3', 'tracks/covers/m1000x1000.jpeg'),
VALUES ('давай расскажем', 'тринадцать карат', '13 причин почему', ' ', 180, 'tracks/music/давай расскажем.mp3', 'tracks/covers/m1000x1000.jpeg'),
VALUES ('пока он тебя не бросит', 'тринадцать карат', '13 причин почему', ' ', 180, 'tracks/music/пока он тебя не бросит.mp3', 'tracks/covers/m1000x1000.jpeg'),
VALUES ('подружка', 'тринадцать карат', '13 причин почему', ' ', 180, 'tracks/music/trinadcat_karat_kasseta_1.mp3', 'tracks/covers/m1000x1000.jpeg'),
VALUES ('больше не буду', 'тринадцать карат', '13 причин почему', ' ', 180, 'tracks/music/тринадцать_карат_Три_больше_не_буду.mp3', 'tracks/covers/m1000x1000.jpeg'),
VALUES ('научился летать', 'тринадцать карат', '13 причин почему', ' ', 180, 'tracks/music/научился_летать_тринадцать_карат.m4a', 'tracks/covers/m1000x1000.jpeg'),
VALUES ('одна', 'тринадцать карат', '13 причин почему', ' ', 180, 'tracks/music/trinadcat_karat_kasseta_1.mp3', 'tracks/covers/m1000x1000.jpeg'),
VALUES ('жить после', 'тринадцать карат', '13 причин почему', ' ', 180, 'tracks/music/жить после - тринадцать карат.m4a', 'tracks/covers/m1000x1000.jpeg'),

-- Kai Angel AMC
VALUES ('JUMP!', 'Kai Angel', 'Angel May Cry', ' ', 180, 'tracks/music/Kai Angel-JUMP!.mp3', 'tracks/covers/Kai-Angel-ANGEL-MAY-CRY-07.jpg'),