PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_review` (
	`applicationId` text PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`editorId` text,
	`score1` integer,
	`score2` integer,
	`score3` integer,
	`notes` text DEFAULT '' NOT NULL,
	`completedAt` integer,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`applicationId`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`editorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "review_score_bounds" CHECK(("__new_review"."score1" IS NULL OR (typeof("__new_review"."score1") = 'integer' AND "__new_review"."score1" BETWEEN 1 AND 5)) AND ("__new_review"."score2" IS NULL OR (typeof("__new_review"."score2") = 'integer' AND "__new_review"."score2" BETWEEN 1 AND 5)) AND ("__new_review"."score3" IS NULL OR (typeof("__new_review"."score3") = 'integer' AND "__new_review"."score3" BETWEEN 1 AND 5))),
	CONSTRAINT "review_complete_scores" CHECK("__new_review"."completedAt" IS NULL OR ("__new_review"."score1" IS NOT NULL AND "__new_review"."score2" IS NOT NULL AND "__new_review"."score3" IS NOT NULL))
);
--> statement-breakpoint
INSERT INTO `__new_review`("applicationId", "version", "editorId", "score1", "score2", "score3", "notes", "completedAt", "updatedAt") SELECT "applicationId", "version", "editorId", "score1", "score2", "score3", "notes", "completedAt", "updatedAt" FROM `review`;--> statement-breakpoint
DROP TABLE `review`;--> statement-breakpoint
ALTER TABLE `__new_review` RENAME TO `review`;--> statement-breakpoint
PRAGMA foreign_keys=ON;