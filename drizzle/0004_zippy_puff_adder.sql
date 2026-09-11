CREATE TABLE `attendance` (
	`eventId` text NOT NULL,
	`userId` text NOT NULL,
	`confirmedAt` integer NOT NULL,
	`dietary` text DEFAULT '' NOT NULL,
	`checkedInAt` integer,
	`checkerId` text,
	PRIMARY KEY(`eventId`, `userId`),
	FOREIGN KEY (`eventId`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`checkerId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `meal_ticket` (
	`eventId` text NOT NULL,
	`userId` text NOT NULL,
	`meal` text NOT NULL,
	`usedAt` integer,
	`checkerId` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`eventId`, `userId`, `meal`),
	FOREIGN KEY (`checkerId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`eventId`,`userId`) REFERENCES `attendance`(`eventId`,`userId`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "meal_type" CHECK("meal_ticket"."meal" in ('breakfast','lunch','dinner','snack'))
);
--> statement-breakpoint
CREATE TABLE `sponsor` (
	`id` text PRIMARY KEY NOT NULL,
	`eventId` text NOT NULL,
	`name` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`eventId`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sponsor_code` (
	`id` text PRIMARY KEY NOT NULL,
	`sponsorId` text NOT NULL,
	`value` text NOT NULL,
	`redeemedBy` text,
	`redeemedAt` integer,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`sponsorId`) REFERENCES `sponsor`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`redeemedBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_code_per_sponsor_user` ON `sponsor_code` (`sponsorId`,`redeemedBy`);