import { Request, Response } from "express";
import * as familyService from "../services/familyService.js";
import logger from "../utils/logger.js";

export const createFamily = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const user = req.user;

    if (!name) {
      return res.status(400).json({ error: "가족 그룹 이름을 입력해주세요" });
    }

    const { family, invite } = await familyService.createFamilyWithInvite(user.uid, name);
    res.status(201).json({ family, invite });
  } catch (error: any) {
    logger.error({ err: error, uid: req.user?.uid }, "Error creating family");
    res.status(500).json({ error: error.message || "가족 그룹 생성에 실패했습니다" });
  }
};

export const generateInvite = async (req: Request, res: Response) => {
  try {
    const { familyId } = req.body;
    const user = req.user;

    if (!familyId) {
      return res.status(400).json({ error: "가족 그룹 ID가 필요합니다" });
    }

    const family = await familyService.getFamilyGroup(familyId);
    if (!family || family.ownerId !== user.uid) {
      return res.status(403).json({ error: "초대 코드는 그룹 소유자만 생성할 수 있습니다" });
    }

    const invite = await familyService.generateInviteCode(familyId);
    res.status(201).json(invite);
  } catch (error: any) {
    logger.error({ err: error, uid: req.user?.uid }, "Error generating invite");
    res.status(500).json({ error: "초대 코드 생성에 실패했습니다" });
  }
};

export const joinFamily = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const user = req.user;

    if (!code) {
      return res.status(400).json({ error: "초대 코드를 입력해주세요" });
    }

    const family = await familyService.joinFamilyGroup(user.uid, code);
    res.status(200).json(family);
  } catch (error: any) {
    logger.error({ err: error, uid: req.user?.uid }, "Error joining family");
    res.status(400).json({ error: error.message || "가족 그룹 참여에 실패했습니다" });
  }
};

export const getMyFamilies = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const families = await familyService.getUserFamilyGroups(user.uid);
    res.status(200).json(families);
  } catch (error: any) {
    logger.error({ err: error, uid: req.user?.uid }, "Error fetching families");
    res.status(500).json({ error: error.message || "가족 그룹 조회에 실패했습니다" });
  }
};
