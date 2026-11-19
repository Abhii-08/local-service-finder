CREATE TABLE service_requests (
  ref TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  locality TEXT NOT NULL,
  description TEXT NOT NULL,
  preferred_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'confirmed', 'completed', 'cancelled'))
);
--> statement-breakpoint
CREATE INDEX service_requests_created_at ON service_requests (created_at DESC);
--> statement-breakpoint
CREATE TABLE hidden_providers (provider_id TEXT PRIMARY KEY);
