import { relations } from "drizzle-orm/relations";
import { subjects, modules, users, chatMessages, communityGroups, groupMembers, professions, communityProjects, projectParticipants, discussions, moduleProgress, peerReviews, adminMessages, teacherStudents, classes, apiCalls, equipmentModels, equipmentCategories, equipmentManuals, equipmentManualTextChunks, manualImages, userConsents, privacyRequests } from "./schema";

export const modulesRelations = relations(modules, ({one, many}) => ({
	subject: one(subjects, {
		fields: [modules.subjectId],
		references: [subjects.id]
	}),
	chatMessages: many(chatMessages),
	communityProjects: many(communityProjects),
	moduleProgresses: many(moduleProgress),
	apiCalls: many(apiCalls),
}));

export const subjectsRelations = relations(subjects, ({one, many}) => ({
	modules: many(modules),
	profession: one(professions, {
		fields: [subjects.professionId],
		references: [professions.id]
	}),
	moduleProgresses: many(moduleProgress),
}));

export const chatMessagesRelations = relations(chatMessages, ({one}) => ({
	user: one(users, {
		fields: [chatMessages.userId],
		references: [users.id]
	}),
	module: one(modules, {
		fields: [chatMessages.relatedModuleId],
		references: [modules.id]
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	chatMessages: many(chatMessages),
	groupMembers: many(groupMembers),
	profession: one(professions, {
		fields: [users.selectedProfessionId],
		references: [professions.id]
	}),
	communityGroups: many(communityGroups),
	communityProjects: many(communityProjects),
	projectParticipants: many(projectParticipants),
	discussions: many(discussions),
	moduleProgresses: many(moduleProgress),
	peerReviews_reviewerId: many(peerReviews, {
		relationName: "peerReviews_reviewerId_users_id"
	}),
	peerReviews_reviewedUserId: many(peerReviews, {
		relationName: "peerReviews_reviewedUserId_users_id"
	}),
	adminMessages: many(adminMessages),
	teacherStudents_teacherId: many(teacherStudents, {
		relationName: "teacherStudents_teacherId_users_id"
	}),
	teacherStudents_studentId: many(teacherStudents, {
		relationName: "teacherStudents_studentId_users_id"
	}),
	classes: many(classes),
	apiCalls: many(apiCalls),
	equipmentModels: many(equipmentModels),
	equipmentManuals: many(equipmentManuals),
	userConsents: many(userConsents),
	privacyRequests: many(privacyRequests),
}));

export const groupMembersRelations = relations(groupMembers, ({one}) => ({
	communityGroup: one(communityGroups, {
		fields: [groupMembers.groupId],
		references: [communityGroups.id]
	}),
	user: one(users, {
		fields: [groupMembers.userId],
		references: [users.id]
	}),
}));

export const communityGroupsRelations = relations(communityGroups, ({one, many}) => ({
	groupMembers: many(groupMembers),
	profession: one(professions, {
		fields: [communityGroups.professionId],
		references: [professions.id]
	}),
	user: one(users, {
		fields: [communityGroups.createdBy],
		references: [users.id]
	}),
	communityProjects: many(communityProjects),
	discussions: many(discussions),
}));

export const professionsRelations = relations(professions, ({many}) => ({
	subjects: many(subjects),
	users: many(users),
	communityGroups: many(communityGroups),
	moduleProgresses: many(moduleProgress),
}));

export const communityProjectsRelations = relations(communityProjects, ({one, many}) => ({
	communityGroup: one(communityGroups, {
		fields: [communityProjects.groupId],
		references: [communityGroups.id]
	}),
	module: one(modules, {
		fields: [communityProjects.moduleId],
		references: [modules.id]
	}),
	user: one(users, {
		fields: [communityProjects.createdBy],
		references: [users.id]
	}),
	projectParticipants: many(projectParticipants),
	discussions: many(discussions),
	peerReviews: many(peerReviews),
}));

export const projectParticipantsRelations = relations(projectParticipants, ({one}) => ({
	communityProject: one(communityProjects, {
		fields: [projectParticipants.projectId],
		references: [communityProjects.id]
	}),
	user: one(users, {
		fields: [projectParticipants.userId],
		references: [users.id]
	}),
}));

export const discussionsRelations = relations(discussions, ({one, many}) => ({
	user: one(users, {
		fields: [discussions.authorId],
		references: [users.id]
	}),
	communityGroup: one(communityGroups, {
		fields: [discussions.groupId],
		references: [communityGroups.id]
	}),
	communityProject: one(communityProjects, {
		fields: [discussions.projectId],
		references: [communityProjects.id]
	}),
	discussion: one(discussions, {
		fields: [discussions.parentId],
		references: [discussions.id],
		relationName: "discussions_parentId_discussions_id"
	}),
	discussions: many(discussions, {
		relationName: "discussions_parentId_discussions_id"
	}),
}));

export const moduleProgressRelations = relations(moduleProgress, ({one}) => ({
	user: one(users, {
		fields: [moduleProgress.userId],
		references: [users.id]
	}),
	module: one(modules, {
		fields: [moduleProgress.moduleId],
		references: [modules.id]
	}),
	profession: one(professions, {
		fields: [moduleProgress.professionId],
		references: [professions.id]
	}),
	subject: one(subjects, {
		fields: [moduleProgress.subjectId],
		references: [subjects.id]
	}),
}));

export const peerReviewsRelations = relations(peerReviews, ({one}) => ({
	communityProject: one(communityProjects, {
		fields: [peerReviews.projectId],
		references: [communityProjects.id]
	}),
	user_reviewerId: one(users, {
		fields: [peerReviews.reviewerId],
		references: [users.id],
		relationName: "peerReviews_reviewerId_users_id"
	}),
	user_reviewedUserId: one(users, {
		fields: [peerReviews.reviewedUserId],
		references: [users.id],
		relationName: "peerReviews_reviewedUserId_users_id"
	}),
}));

export const adminMessagesRelations = relations(adminMessages, ({one}) => ({
	user: one(users, {
		fields: [adminMessages.senderId],
		references: [users.id]
	}),
}));

export const teacherStudentsRelations = relations(teacherStudents, ({one}) => ({
	user_teacherId: one(users, {
		fields: [teacherStudents.teacherId],
		references: [users.id],
		relationName: "teacherStudents_teacherId_users_id"
	}),
	user_studentId: one(users, {
		fields: [teacherStudents.studentId],
		references: [users.id],
		relationName: "teacherStudents_studentId_users_id"
	}),
}));

export const classesRelations = relations(classes, ({one}) => ({
	user: one(users, {
		fields: [classes.assignedTeacherId],
		references: [users.id]
	}),
}));

export const apiCallsRelations = relations(apiCalls, ({one}) => ({
	user: one(users, {
		fields: [apiCalls.userId],
		references: [users.id]
	}),
	module: one(modules, {
		fields: [apiCalls.moduleId],
		references: [modules.id]
	}),
}));

export const equipmentModelsRelations = relations(equipmentModels, ({one, many}) => ({
	user: one(users, {
		fields: [equipmentModels.manufacturerId],
		references: [users.id]
	}),
	equipmentCategory: one(equipmentCategories, {
		fields: [equipmentModels.categoryId],
		references: [equipmentCategories.id]
	}),
	equipmentManuals: many(equipmentManuals),
}));

export const equipmentCategoriesRelations = relations(equipmentCategories, ({many}) => ({
	equipmentModels: many(equipmentModels),
}));

export const equipmentManualsRelations = relations(equipmentManuals, ({one, many}) => ({
	equipmentModel: one(equipmentModels, {
		fields: [equipmentManuals.equipmentModelId],
		references: [equipmentModels.id]
	}),
	user: one(users, {
		fields: [equipmentManuals.uploadedBy],
		references: [users.id]
	}),
	equipmentManualTextChunks: many(equipmentManualTextChunks),
	manualImages: many(manualImages),
}));

export const equipmentManualTextChunksRelations = relations(equipmentManualTextChunks, ({one}) => ({
	equipmentManual: one(equipmentManuals, {
		fields: [equipmentManualTextChunks.manualId],
		references: [equipmentManuals.id]
	}),
}));

export const manualImagesRelations = relations(manualImages, ({one}) => ({
	equipmentManual: one(equipmentManuals, {
		fields: [manualImages.manualId],
		references: [equipmentManuals.id]
	}),
}));

export const userConsentsRelations = relations(userConsents, ({one}) => ({
	user: one(users, {
		fields: [userConsents.userId],
		references: [users.id]
	}),
}));

export const privacyRequestsRelations = relations(privacyRequests, ({one}) => ({
	user: one(users, {
		fields: [privacyRequests.userId],
		references: [users.id]
	}),
}));