import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import voiceRouter from "./voice";
import curriculumRouter from "./curriculum";
import conversationRouter from "./conversation";
import feedbackRouter from "./feedback";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(voiceRouter);
router.use(curriculumRouter);
router.use(conversationRouter);
router.use(feedbackRouter);

export default router;
