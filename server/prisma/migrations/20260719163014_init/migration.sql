-- CreateEnum
CREATE TYPE "Season" AS ENUM ('spring', 'summer', 'fall', 'winter');

-- CreateEnum
CREATE TYPE "SwipeDirection" AS ENUM ('left', 'right');

-- CreateTable
CREATE TABLE "destinations" (
    "id" UUID NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "tags" TEXT[],
    "hero_image_url" TEXT NOT NULL,
    "popularity_score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_by_season" (
    "id" UUID NOT NULL,
    "destination_id" UUID NOT NULL,
    "season" "Season" NOT NULL,
    "price_low" DECIMAL(10,2) NOT NULL,
    "price_avg" DECIMAL(10,2) NOT NULL,
    "price_high" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "source" TEXT NOT NULL,
    "last_updated" DATE NOT NULL,

    CONSTRAINT "pricing_by_season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_by_season" (
    "id" UUID NOT NULL,
    "destination_id" UUID NOT NULL,
    "season" "Season" NOT NULL,
    "avg_temp_c" DECIMAL(4,1) NOT NULL,
    "rain_chance_pct" INTEGER NOT NULL,
    "is_best_time" BOOLEAN NOT NULL,

    CONSTRAINT "weather_by_season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swipes" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "destination_id" UUID NOT NULL,
    "direction" "SwipeDirection" NOT NULL,
    "swiped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "swipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortlists" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "destination_id" UUID NOT NULL,
    "date_range_start" DATE,
    "date_range_end" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shortlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_filters" (
    "user_id" UUID NOT NULL,
    "budget_cap" DECIMAL(10,2),
    "preferred_season" "Season",
    "preferred_tags" TEXT[],

    CONSTRAINT "user_filters_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "destinations_city_country_key" ON "destinations"("city", "country");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_by_season_destination_id_season_key" ON "pricing_by_season"("destination_id", "season");

-- CreateIndex
CREATE UNIQUE INDEX "weather_by_season_destination_id_season_key" ON "weather_by_season"("destination_id", "season");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "swipes_user_id_destination_id_idx" ON "swipes"("user_id", "destination_id");

-- CreateIndex
CREATE UNIQUE INDEX "shortlists_user_id_destination_id_key" ON "shortlists"("user_id", "destination_id");

-- AddForeignKey
ALTER TABLE "pricing_by_season" ADD CONSTRAINT "pricing_by_season_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather_by_season" ADD CONSTRAINT "weather_by_season_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlists" ADD CONSTRAINT "shortlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlists" ADD CONSTRAINT "shortlists_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_filters" ADD CONSTRAINT "user_filters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
