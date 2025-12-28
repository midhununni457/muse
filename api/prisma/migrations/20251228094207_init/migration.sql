-- CreateTable
CREATE TABLE "Songs" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Songs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hashes" (
    "hash" BIGINT NOT NULL,
    "songId" INTEGER NOT NULL,
    "t1" INTEGER NOT NULL,

    CONSTRAINT "Hashes_pkey" PRIMARY KEY ("hash","songId","t1")
);

-- CreateIndex
CREATE UNIQUE INDEX "Songs_filePath_key" ON "Songs"("filePath");

-- CreateIndex
CREATE INDEX "Hashes_hash_idx" ON "Hashes"("hash");

-- CreateIndex
CREATE INDEX "Hashes_songId_idx" ON "Hashes"("songId");

-- AddForeignKey
ALTER TABLE "Hashes" ADD CONSTRAINT "Hashes_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Songs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
