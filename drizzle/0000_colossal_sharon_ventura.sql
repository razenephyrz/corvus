CREATE TABLE "absensi" (
	"id" serial PRIMARY KEY NOT NULL,
	"pertemuan_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" text NOT NULL,
	"keterangan" text,
	CONSTRAINT "absensi_unique" UNIQUE("pertemuan_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"aksi" text NOT NULL,
	"tabel" text NOT NULL,
	"record_id" integer,
	"old_data" jsonb,
	"new_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jadwal" (
	"id" serial PRIMARY KEY NOT NULL,
	"matkul_id" integer NOT NULL,
	"hari" text,
	"tanggal_spesifik" date,
	"jam_mulai" time NOT NULL,
	"jam_selesai" time NOT NULL,
	"ruangan" text,
	"is_reschedule" boolean DEFAULT false NOT NULL,
	"catatan" text,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kalender_akademik" (
	"id" serial PRIMARY KEY NOT NULL,
	"tanggal" date NOT NULL,
	"judul" text NOT NULL,
	"kategori" text DEFAULT 'AKADEMIK' NOT NULL,
	"keterangan" text
);
--> statement-breakpoint
CREATE TABLE "kelas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"angkatan" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matkul" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"kelas_id" integer NOT NULL,
	"dosen_nama" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pendaftaran_mahasiswa" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"nim" text NOT NULL,
	"email" text NOT NULL,
	"kelas_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_by" integer,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pengumuman" (
	"id" serial PRIMARY KEY NOT NULL,
	"kelas_id" integer,
	"judul" text NOT NULL,
	"ringkasan" text NOT NULL,
	"kategori" text DEFAULT 'UMUM' NOT NULL,
	"dibuat_oleh" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pertemuan" (
	"id" serial PRIMARY KEY NOT NULL,
	"matkul_id" integer NOT NULL,
	"tanggal" date NOT NULL,
	"pertemuan_ke" integer NOT NULL,
	"input_oleh" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tugas" (
	"id" serial PRIMARY KEY NOT NULL,
	"matkul_id" integer NOT NULL,
	"judul" text NOT NULL,
	"deskripsi" text,
	"deadline" timestamp with time zone NOT NULL,
	"dibuat_oleh" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tugas_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"tugas_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tugas_status_unique" UNIQUE("tugas_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role" text NOT NULL,
	"matkul_id" integer
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"email" text NOT NULL,
	"nim" text,
	"password_hash" text NOT NULL,
	"kelas_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_nim_unique" UNIQUE("nim")
);
--> statement-breakpoint
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_pertemuan_id_pertemuan_id_fk" FOREIGN KEY ("pertemuan_id") REFERENCES "public"."pertemuan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jadwal" ADD CONSTRAINT "jadwal_matkul_id_matkul_id_fk" FOREIGN KEY ("matkul_id") REFERENCES "public"."matkul"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jadwal" ADD CONSTRAINT "jadwal_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matkul" ADD CONSTRAINT "matkul_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pendaftaran_mahasiswa" ADD CONSTRAINT "pendaftaran_mahasiswa_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pendaftaran_mahasiswa" ADD CONSTRAINT "pendaftaran_mahasiswa_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengumuman" ADD CONSTRAINT "pengumuman_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengumuman" ADD CONSTRAINT "pengumuman_dibuat_oleh_users_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pertemuan" ADD CONSTRAINT "pertemuan_matkul_id_matkul_id_fk" FOREIGN KEY ("matkul_id") REFERENCES "public"."matkul"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pertemuan" ADD CONSTRAINT "pertemuan_input_oleh_users_id_fk" FOREIGN KEY ("input_oleh") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tugas" ADD CONSTRAINT "tugas_matkul_id_matkul_id_fk" FOREIGN KEY ("matkul_id") REFERENCES "public"."matkul"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tugas" ADD CONSTRAINT "tugas_dibuat_oleh_users_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tugas_status" ADD CONSTRAINT "tugas_status_tugas_id_tugas_id_fk" FOREIGN KEY ("tugas_id") REFERENCES "public"."tugas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tugas_status" ADD CONSTRAINT "tugas_status_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_matkul_id_matkul_id_fk" FOREIGN KEY ("matkul_id") REFERENCES "public"."matkul"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE no action ON UPDATE no action;