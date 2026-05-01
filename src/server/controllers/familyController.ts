import { Request, Response } from "express";
import * as familyService from "../services/familyService.js";

export const createFamily = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const user = req.user;

    if (!name) {
      return res.status(400).json({ error: "Family name is required" });
    }

    const { family, invite } = await familyService.createFamilyWithInvite(user.uid, name);
    res.status(201).json({ family, invite });
  } catch (error: any) {
    console.error("Error creating family:", error);
    res.status(500).json({ error: error.message || "Failed to create family group" });
  }
};

export const generateInvite = async (req: Request, res: Response) => {
  try {
    const { familyId } = req.body;
    const user = req.user;

    if (!familyId) {
      return res.status(400).json({ error: "Family ID is required" });
    }

    const family = await familyService.getFamilyGroup(familyId);
    if (!family || family.ownerId !== user.uid) {
      return res.status(403).json({ error: "Only the owner can generate invites" });
    }

    const invite = await familyService.generateInviteCode(familyId);
    res.status(201).json(invite);
  } catch (error) {
    console.error("Error generating invite:", error);
    res.status(500).json({ error: "Failed to generate invite code" });
  }
};

export const joinFamily = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const user = req.user;

    if (!code) {
      return res.status(400).json({ error: "Invite code is required" });
    }

    const family = await familyService.joinFamilyGroup(user.uid, code);
    res.status(200).json(family);
  } catch (error: any) {
    console.error("Error joining family:", error);
    res.status(400).json({ error: error.message || "Failed to join family group" });
  }
};

export const getMyFamilies = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const families = await familyService.getUserFamilyGroups(user.uid);
    res.status(200).json(families);
  } catch (error: any) {
    console.error("Error fetching families:", error);
    res.status(500).json({ error: error.message || "Failed to fetch family groups" });
  }
};
