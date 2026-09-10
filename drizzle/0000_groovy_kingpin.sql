CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`scope` text,
	`password` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`userId`);--> statement-breakpoint
CREATE TABLE `administrator` (
	`userId` text PRIMARY KEY NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `application` (
	`id` text PRIMARY KEY NOT NULL,
	`eventId` text NOT NULL,
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`organization` text DEFAULT '' NOT NULL,
	`introduction` text DEFAULT '' NOT NULL,
	`link` text DEFAULT '' NOT NULL,
	`formVersion` integer NOT NULL,
	`rubricVersion` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updatedAt` integer NOT NULL,
	`submittedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`eventId`,`type`) REFERENCES `offered_type`(`eventId`,`type`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "application_status" CHECK("application"."status" IN ('draft','submitted'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `application_owner_type` ON `application` (`eventId`,`userId`,`type`);--> statement-breakpoint
CREATE UNIQUE INDEX `application_id_type` ON `application` (`id`,`type`);--> statement-breakpoint
CREATE INDEX `application_queue` ON `application` (`eventId`,`type`,`status`,`id`);--> statement-breakpoint
CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`eventId` text NOT NULL,
	`actorId` text NOT NULL,
	`action` text NOT NULL,
	`details` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`eventId`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `claim` (
	`applicationId` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`token` text NOT NULL,
	`expiresAt` integer NOT NULL,
	FOREIGN KEY (`applicationId`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `decision` (
	`id` text PRIMARY KEY NOT NULL,
	`applicationId` text NOT NULL,
	`sequence` integer NOT NULL,
	`value` text NOT NULL,
	`reason` text NOT NULL,
	`actorId` text NOT NULL,
	`createdAt` integer NOT NULL,
	`reviewVersion` integer NOT NULL,
	`previousPublishedSequence` integer NOT NULL,
	FOREIGN KEY (`applicationId`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "decision_value" CHECK("decision"."value" IN ('accepted','waitlisted','rejected'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `decision_sequence` ON `decision` (`applicationId`,`sequence`);--> statement-breakpoint
CREATE TABLE `event` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`venue` text NOT NULL,
	`timezone` text NOT NULL,
	`opensAt` integer NOT NULL,
	`closesAt` integer NOT NULL,
	`startsAt` integer NOT NULL,
	`endsAt` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	CONSTRAINT "event_dates" CHECK("event"."opensAt" < "event"."closesAt" AND "event"."closesAt" <= "event"."startsAt" AND "event"."startsAt" < "event"."endsAt"),
	CONSTRAINT "event_status" CHECK("event"."status" IN ('draft','published','archived'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_slug_unique` ON `event` (`slug`);--> statement-breakpoint
CREATE TABLE `hacker_answer` (
	`applicationId` text PRIMARY KEY NOT NULL,
	`type` text DEFAULT 'hacker' NOT NULL,
	`interests` text NOT NULL,
	`experience` text NOT NULL,
	`ambition` text NOT NULL,
	FOREIGN KEY (`applicationId`,`type`) REFERENCES `application`(`id`,`type`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "hacker_answer_type" CHECK("hacker_answer"."type" = 'hacker')
);
--> statement-breakpoint
CREATE TABLE `membership` (
	`eventId` text NOT NULL,
	`userId` text NOT NULL,
	`role` text NOT NULL,
	PRIMARY KEY(`eventId`, `userId`),
	FOREIGN KEY (`eventId`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "member_role" CHECK("membership"."role" IN ('manager','reviewer'))
);
--> statement-breakpoint
CREATE TABLE `mentor_answer` (
	`applicationId` text PRIMARY KEY NOT NULL,
	`type` text DEFAULT 'mentor' NOT NULL,
	`expertise` text NOT NULL,
	`mentoring` text NOT NULL,
	`availability` text NOT NULL,
	FOREIGN KEY (`applicationId`,`type`) REFERENCES `application`(`id`,`type`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "mentor_answer_type" CHECK("mentor_answer"."type" = 'mentor')
);
--> statement-breakpoint
CREATE TABLE `offered_type` (
	`eventId` text NOT NULL,
	`type` text NOT NULL,
	`formVersion` integer DEFAULT 1 NOT NULL,
	`rubricVersion` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`eventId`, `type`),
	FOREIGN KEY (`eventId`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "offered_type_name" CHECK("offered_type"."type" IN ('hacker','mentor'))
);
--> statement-breakpoint
CREATE TABLE `prepared_decision` (
	`applicationId` text PRIMARY KEY NOT NULL,
	`revisionId` text NOT NULL,
	FOREIGN KEY (`applicationId`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`revisionId`) REFERENCES `decision`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prepared_decision_revisionId_unique` ON `prepared_decision` (`revisionId`);--> statement-breakpoint
CREATE TABLE `publication` (
	`revisionId` text PRIMARY KEY NOT NULL,
	`releaseId` text NOT NULL,
	FOREIGN KEY (`revisionId`) REFERENCES `decision`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`releaseId`) REFERENCES `release`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `release` (
	`id` text PRIMARY KEY NOT NULL,
	`eventId` text NOT NULL,
	`createdBy` text NOT NULL,
	`createdAt` integer NOT NULL,
	`publishedBy` text,
	`publishedAt` integer,
	FOREIGN KEY (`eventId`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`publishedBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `release_item` (
	`releaseId` text NOT NULL,
	`revisionId` text NOT NULL,
	PRIMARY KEY(`releaseId`, `revisionId`),
	FOREIGN KEY (`releaseId`) REFERENCES `release`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`revisionId`) REFERENCES `decision`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `review` (
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
	CONSTRAINT "review_score_bounds" CHECK(("review"."score1" IS NULL OR "review"."score1" BETWEEN 1 AND 5) AND ("review"."score2" IS NULL OR "review"."score2" BETWEEN 1 AND 5) AND ("review"."score3" IS NULL OR "review"."score3" BETWEEN 1 AND 5)),
	CONSTRAINT "review_complete_scores" CHECK("review"."completedAt" IS NULL OR ("review"."score1" IS NOT NULL AND "review"."score2" IS NOT NULL AND "review"."score3" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`userId` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`userId`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);