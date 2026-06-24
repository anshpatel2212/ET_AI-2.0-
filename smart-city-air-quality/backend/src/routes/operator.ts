import { Router } from 'express';
import { validate } from '../middleware/validate';
import { dispatchSchema, interveneActionSchema } from '../validation';
import { authenticate, authorize } from '../middleware/auth';
import * as operatorCtrl from '../controllers/operatorController';

const router = Router();

router.use(authenticate, authorize('operator', 'admin'));

router.get('/alerts/queue', operatorCtrl.getAlertQueue);
router.put('/alerts/:id/acknowledge', operatorCtrl.acknowledgeAlertHandler);
router.post('/alerts/:id/resolve', operatorCtrl.resolveAlertHandler);
router.get('/interventions/queue', operatorCtrl.getInterventionQueue);
router.post('/interventions/:id/approve', validate(interveneActionSchema), operatorCtrl.approveIntervention);
router.post('/interventions/:id/reject', operatorCtrl.rejectIntervention);
router.get('/sources/breakdown', operatorCtrl.getSourceBreakdown);
router.post('/dispatch', validate(dispatchSchema), operatorCtrl.dispatchHandler);
router.get('/deployments/active', operatorCtrl.getActiveDeploymentsHandler);
router.get('/effectiveness/report', operatorCtrl.getEffectivenessReport);

export default router;
