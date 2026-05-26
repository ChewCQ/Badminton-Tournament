-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'REGISTRATION_OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TournamentFormat" AS ENUM ('ROUND_ROBIN', 'KNOCKOUT', 'POOL_TO_BRACKET');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('SINGLES', 'DOUBLES', 'MIXED_DOUBLES');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'WALKOVER', 'CANCELLED', 'BYE');

-- CreateEnum
CREATE TYPE "NextMatchSlot" AS ENUM ('SLOT_1', 'SLOT_2');

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "venue" TEXT,
    "posterUrl" TEXT,
    "hostLogoUrl" TEXT,
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "numberOfCourts" INTEGER NOT NULL,
    "estimatedMatchDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "restPeriodMinutes" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'STANDARD',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tournamentId" TEXT NOT NULL,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Court" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "courtNumber" INTEGER NOT NULL,
    "tournamentId" TEXT NOT NULL,

    CONSTRAINT "Court_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "format" "TournamentFormat" NOT NULL,
    "poolSize" INTEGER NOT NULL DEFAULT 4,
    "advanceCount" INTEGER NOT NULL DEFAULT 2,
    "bestOf" INTEGER NOT NULL DEFAULT 3,
    "tournamentId" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teamName" TEXT,
    "seed" INTEGER,
    "categoryId" TEXT NOT NULL,
    "poolId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerOnParticipant" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,

    CONSTRAINT "PlayerOnParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "poolNumber" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "Pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "poolId" TEXT,
    "courtId" TEXT,
    "participant1Id" TEXT,
    "participant2Id" TEXT,
    "winnerId" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledStartTime" TIMESTAMP(3),
    "scheduledEndTime" TIMESTAMP(3),
    "actualStartTime" TIMESTAMP(3),
    "actualEndTime" TIMESTAMP(3),
    "roundNumber" INTEGER NOT NULL,
    "bracketRound" INTEGER,
    "bracketPosition" INTEGER,
    "nextMatchId" TEXT,
    "nextMatchSlot" "NextMatchSlot",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchSet" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "score1" INTEGER NOT NULL,
    "score2" INTEGER NOT NULL,

    CONSTRAINT "MatchSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Standing" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "poolId" TEXT,
    "rank" INTEGER NOT NULL,
    "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
    "matchesWon" INTEGER NOT NULL DEFAULT 0,
    "matchesLost" INTEGER NOT NULL DEFAULT 0,
    "setsWon" INTEGER NOT NULL DEFAULT 0,
    "setsLost" INTEGER NOT NULL DEFAULT 0,
    "pointsWon" INTEGER NOT NULL DEFAULT 0,
    "pointsLost" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Standing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sponsor_tournamentId_idx" ON "Sponsor"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "Court_tournamentId_courtNumber_key" ON "Court"("tournamentId", "courtNumber");

-- CreateIndex
CREATE INDEX "Category_tournamentId_idx" ON "Category"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_email_key" ON "Player"("email");

-- CreateIndex
CREATE INDEX "Participant_categoryId_idx" ON "Participant"("categoryId");

-- CreateIndex
CREATE INDEX "Participant_poolId_idx" ON "Participant"("poolId");

-- CreateIndex
CREATE INDEX "PlayerOnParticipant_playerId_idx" ON "PlayerOnParticipant"("playerId");

-- CreateIndex
CREATE INDEX "PlayerOnParticipant_participantId_idx" ON "PlayerOnParticipant"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerOnParticipant_playerId_participantId_key" ON "PlayerOnParticipant"("playerId", "participantId");

-- CreateIndex
CREATE INDEX "Pool_categoryId_idx" ON "Pool"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Pool_categoryId_poolNumber_key" ON "Pool"("categoryId", "poolNumber");

-- CreateIndex
CREATE INDEX "Match_categoryId_idx" ON "Match"("categoryId");

-- CreateIndex
CREATE INDEX "Match_poolId_idx" ON "Match"("poolId");

-- CreateIndex
CREATE INDEX "Match_courtId_idx" ON "Match"("courtId");

-- CreateIndex
CREATE INDEX "Match_participant1Id_idx" ON "Match"("participant1Id");

-- CreateIndex
CREATE INDEX "Match_participant2Id_idx" ON "Match"("participant2Id");

-- CreateIndex
CREATE INDEX "Match_nextMatchId_idx" ON "Match"("nextMatchId");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "Match_scheduledStartTime_idx" ON "Match"("scheduledStartTime");

-- CreateIndex
CREATE INDEX "MatchSet_matchId_idx" ON "MatchSet"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSet_matchId_setNumber_key" ON "MatchSet"("matchId", "setNumber");

-- CreateIndex
CREATE INDEX "Standing_categoryId_idx" ON "Standing"("categoryId");

-- CreateIndex
CREATE INDEX "Standing_participantId_idx" ON "Standing"("participantId");

-- CreateIndex
CREATE INDEX "Standing_poolId_idx" ON "Standing"("poolId");

-- CreateIndex
CREATE UNIQUE INDEX "Standing_categoryId_participantId_key" ON "Standing"("categoryId", "participantId");

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Court" ADD CONSTRAINT "Court_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerOnParticipant" ADD CONSTRAINT "PlayerOnParticipant_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerOnParticipant" ADD CONSTRAINT "PlayerOnParticipant_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pool" ADD CONSTRAINT "Pool_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_participant1Id_fkey" FOREIGN KEY ("participant1Id") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_participant2Id_fkey" FOREIGN KEY ("participant2Id") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_nextMatchId_fkey" FOREIGN KEY ("nextMatchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSet" ADD CONSTRAINT "MatchSet_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Standing" ADD CONSTRAINT "Standing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Standing" ADD CONSTRAINT "Standing_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Standing" ADD CONSTRAINT "Standing_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE SET NULL ON UPDATE CASCADE;
