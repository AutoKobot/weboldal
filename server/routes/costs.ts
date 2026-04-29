import { Router } from "express";
import { storage } from "../storage";
import { combinedAuth } from "./middleware";

const router = Router();

const adminOnly = async (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

router.get('/stats', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    await storage.ensureCurrentMonthCostEntry();
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const stats = await storage.getApiCallStats(year, month);
    const monthlyCosts = await storage.getMonthlyCosts(year);

    res.json({
      apiStats: stats,
      monthlyCosts,
      currentMonth: {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
      }
    });
  } catch (error) {
    console.error('Error fetching cost stats:', error);
    res.status(500).json({ message: 'Failed to fetch cost statistics' });
  }
});

router.post('/monthly', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const { year, month, developmentCosts, infrastructureCosts, otherCosts, notes } = req.body;
    const apiCosts = await storage.calculateMonthlyApiCosts(year, month);
    const totalCosts = parseFloat(apiCosts.toString()) +
      parseFloat(developmentCosts || 0) +
      parseFloat(infrastructureCosts || 0) +
      parseFloat(otherCosts || 0);

    const costData = await storage.upsertMonthlyCost({
      year,
      month,
      apiCosts: apiCosts.toFixed(2),
      developmentCosts: developmentCosts || '0.00',
      infrastructureCosts: infrastructureCosts || '0.00',
      otherCosts: otherCosts || '0.00',
      totalCosts: totalCosts.toFixed(2),
      notes
    });
    res.json(costData);
  } catch (error) {
    console.error('Error updating monthly costs:', error);
    res.status(500).json({ message: 'Failed to update monthly costs' });
  }
});

router.put('/monthly/:id', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { developmentCosts, infrastructureCosts, otherCosts, notes } = req.body;
    const existing = await storage.getMonthlyCostById(parseInt(id));
    if (!existing) return res.status(404).json({ message: 'Monthly cost entry not found' });

    const apiCosts = await storage.calculateMonthlyApiCosts(existing.year, existing.month);
    const totalCosts = parseFloat(apiCosts.toString()) +
      parseFloat(developmentCosts || 0) +
      parseFloat(infrastructureCosts || 0) +
      parseFloat(otherCosts || 0);

    const updatedCost = await storage.updateMonthlyCost(parseInt(id), {
      apiCosts: apiCosts.toFixed(2),
      developmentCosts: developmentCosts || '0.00',
      infrastructureCosts: infrastructureCosts || '0.00',
      otherCosts: otherCosts || '0.00',
      totalCosts: totalCosts.toFixed(2),
      notes: notes || null
    });
    res.json(updatedCost);
  } catch (error) {
    console.error('Error updating monthly cost:', error);
    res.status(500).json({ message: 'Failed to update monthly cost' });
  }
});

router.get('/api-pricing', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const pricing = await storage.getApiPricing();
    const uniqueProviders = await storage.getUniqueApiProviders();
    res.json({ pricing, uniqueProviders });
  } catch (error) {
    console.error('Error fetching API pricing:', error);
    res.status(500).json({ message: 'Failed to fetch API pricing' });
  }
});

router.post('/api-pricing', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const { provider, service, model, pricePerToken, pricePerRequest } = req.body;
    const pricingData = await storage.upsertApiPricing({
      provider, service, model: model || null,
      pricePerToken: pricePerToken || '0.00000000',
      pricePerRequest: pricePerRequest || '0.000000',
      isActive: true
    });
    res.json(pricingData);
  } catch (error) {
    console.error('Error updating API pricing:', error);
    res.status(500).json({ message: 'Failed to update API pricing' });
  }
});

router.delete('/api-pricing/:id', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    await storage.deleteApiPricing(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting API pricing:', error);
    res.status(500).json({ message: 'Failed to delete API pricing' });
  }
});

export default router;
