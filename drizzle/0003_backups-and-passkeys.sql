CREATE TABLE "passkey_challenges" (
	"challenge" text PRIMARY KEY NOT NULL,
	"purpose" text NOT NULL,
	"origin" text NOT NULL,
	"user_id" uuid,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passkeys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"public_key" text NOT NULL,
	"counter" bigint DEFAULT 0 NOT NULL,
	"label" text NOT NULL,
	"rp_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recovery_codes" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"hashes" text[] NOT NULL
);
--> statement-breakpoint
ALTER TABLE "otp_entries" ADD COLUMN "restore_key" text;--> statement-breakpoint
ALTER TABLE "passkey_challenges" ADD CONSTRAINT "passkey_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_codes" ADD CONSTRAINT "recovery_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "passkey_challenges_expiry_idx" ON "passkey_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "passkeys_user_idx" ON "passkeys" USING btree ("user_id","rp_id");--> statement-breakpoint
ALTER TABLE "otp_entries" ADD CONSTRAINT "otp_entries_restore_key_unique" UNIQUE("restore_key");