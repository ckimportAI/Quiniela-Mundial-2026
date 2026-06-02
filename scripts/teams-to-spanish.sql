-- Update team names to Spanish (idempotent: WHERE clause guards against double-runs)
BEGIN;

UPDATE teams SET name = 'República Checa'        WHERE name = 'Czech Republic';
UPDATE teams SET name = 'Corea del Sur'          WHERE name = 'Korea Republic';
UPDATE teams SET name = 'México'                 WHERE name = 'Mexico';
UPDATE teams SET name = 'Sudáfrica'              WHERE name = 'South Africa';
UPDATE teams SET name = 'Bosnia y Herzegovina'   WHERE name = 'Bosnia and Herzegovina';
UPDATE teams SET name = 'Canadá'                 WHERE name = 'Canada';
UPDATE teams SET name = 'Catar'                  WHERE name = 'Qatar';
UPDATE teams SET name = 'Suiza'                  WHERE name = 'Switzerland';
UPDATE teams SET name = 'Brasil'                 WHERE name = 'Brazil';
UPDATE teams SET name = 'Haití'                  WHERE name = 'Haiti';
UPDATE teams SET name = 'Marruecos'              WHERE name = 'Morocco';
UPDATE teams SET name = 'Escocia'                WHERE name = 'Scotland';
UPDATE teams SET name = 'Turquía'                WHERE name = 'Turkey';
UPDATE teams SET name = 'Estados Unidos'         WHERE name = 'United States';
UPDATE teams SET name = 'Curazao'                WHERE name = 'Curacao';
UPDATE teams SET name = 'Alemania'               WHERE name = 'Germany';
UPDATE teams SET name = 'Costa de Marfil'        WHERE name = 'Ivory Coast';
UPDATE teams SET name = 'Japón'                  WHERE name = 'Japan';
UPDATE teams SET name = 'Países Bajos'           WHERE name = 'Netherlands';
UPDATE teams SET name = 'Suecia'                 WHERE name = 'Sweden';
UPDATE teams SET name = 'Túnez'                  WHERE name = 'Tunisia';
UPDATE teams SET name = 'Bélgica'                WHERE name = 'Belgium';
UPDATE teams SET name = 'Egipto'                 WHERE name = 'Egypt';
UPDATE teams SET name = 'Irán'                   WHERE name = 'Iran';
UPDATE teams SET name = 'Nueva Zelanda'          WHERE name = 'New Zealand';
UPDATE teams SET name = 'Arabia Saudita'         WHERE name = 'Saudi Arabia';
UPDATE teams SET name = 'España'                 WHERE name = 'Spain';
UPDATE teams SET name = 'Francia'                WHERE name = 'France';
UPDATE teams SET name = 'Irak'                   WHERE name = 'Iraq';
UPDATE teams SET name = 'Noruega'                WHERE name = 'Norway';
UPDATE teams SET name = 'Argelia'                WHERE name = 'Algeria';
UPDATE teams SET name = 'Jordania'               WHERE name = 'Jordan';
UPDATE teams SET name = 'RD Congo'               WHERE name = 'DR Congo';
UPDATE teams SET name = 'Uzbekistán'             WHERE name = 'Uzbekistan';
UPDATE teams SET name = 'Croacia'                WHERE name = 'Croatia';
UPDATE teams SET name = 'Inglaterra'             WHERE name = 'England';
UPDATE teams SET name = 'Panamá'                 WHERE name = 'Panama';

-- Sanity check: count remaining English-only common names
SELECT name FROM teams WHERE name IN (
  'Czech Republic','Korea Republic','Mexico','South Africa','Brazil','England','France',
  'Germany','Spain','Netherlands','United States','Saudi Arabia','Croatia','Panama'
);

COMMIT;

-- Show final list
SELECT g.name AS grupo, string_agg(t.name, ', ' ORDER BY t.name) AS equipos
FROM teams t JOIN groups g ON t."groupId" = g.id
GROUP BY g.name ORDER BY g.name;
