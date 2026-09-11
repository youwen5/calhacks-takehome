CREATE TABLE `resume` (
	`applicationId` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`bytes` blob NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`applicationId`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE no action
);
