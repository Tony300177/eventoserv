CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` varchar(80) NOT NULL,
	`registrationId` int,
	`actorUserId` int,
	`summary` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eventSettings` (
	`id` int NOT NULL,
	`capacity` int NOT NULL DEFAULT 200,
	`occupied` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`protocol` varchar(24) NOT NULL,
	`schoolSector` varchar(140) NOT NULL,
	`role` varchar(160) NOT NULL,
	`employeeName` varchar(180) NOT NULL,
	`hasCompanion` int NOT NULL DEFAULT 0,
	`companionName` varchar(180),
	`peopleCount` int NOT NULL DEFAULT 1,
	`status` enum('active','cancelled') NOT NULL DEFAULT 'active',
	`rulesVersion` varchar(32) NOT NULL DEFAULT '1.0',
	`rulesAcceptedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`cancelledAt` timestamp,
	`cancelledBy` int,
	`cancellationReason` text,
	CONSTRAINT `registrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `registrations_protocol_unique` UNIQUE(`protocol`)
);
