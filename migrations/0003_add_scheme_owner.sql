ALTER TABLE schemes ADD COLUMN owner TEXT;

CREATE INDEX schemes_owner ON schemes (owner);
