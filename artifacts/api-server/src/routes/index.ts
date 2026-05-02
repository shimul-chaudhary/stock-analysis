import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stocksRouter from "./stocks";
import macroRouter from "./macro";
import holdingsRouter from "./holdings";
import analysisRouter from "./analysis";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stocksRouter);
router.use(macroRouter);
router.use(holdingsRouter);
router.use(analysisRouter);

export default router;
