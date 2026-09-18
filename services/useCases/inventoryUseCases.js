function invalid(code) {
  return Object.assign(new Error(code), { code });
}

function positiveInteger(value, code) {
  const parsed = Math.trunc(Number(value));
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw invalid(code);
  return parsed;
}

function requiredId(value, code) {
  const id = String(value || '').trim();
  if (!id) throw invalid(code);
  return id;
}

export function createGrantCardUseCase(repository) {
  return Object.freeze({
    execute: (profileId, cardId, copies, reason = 'Ajuste administrativo') =>
      repository.adminGrantCard(
        requiredId(profileId, 'PROFILE_REQUIRED'),
        requiredId(cardId, 'CARD_ID_REQUIRED'),
        positiveInteger(copies, 'INVALID_COPIES'),
        String(reason || '').trim() || 'Ajuste administrativo'
      ),
  });
}

export function createRemoveCardUseCase(repository) {
  return Object.freeze({
    execute: (profileId, cardId, copies, reason = 'Ajuste administrativo') =>
      repository.adminRemoveCard(
        requiredId(profileId, 'PROFILE_REQUIRED'),
        requiredId(cardId, 'CARD_ID_REQUIRED'),
        positiveInteger(copies, 'INVALID_COPIES'),
        String(reason || '').trim() || 'Ajuste administrativo'
      ),
  });
}

export function createTransferCardUseCase(repository) {
  return Object.freeze({
    execute: (fromProfileId, toProfileId, cardId, copies, reason = 'Transferência administrativa') => {
      const from = requiredId(fromProfileId, 'SOURCE_PROFILE_REQUIRED');
      const to = requiredId(toProfileId, 'TARGET_PROFILE_REQUIRED');
      if (from === to) throw invalid('SAME_PROFILE_TRANSFER');
      return repository.adminTransferCard(
        from,
        to,
        requiredId(cardId, 'CARD_ID_REQUIRED'),
        positiveInteger(copies, 'INVALID_COPIES'),
        String(reason || '').trim() || 'Transferência administrativa'
      );
    },
  });
}

export function createEquipItemUseCase(repository) {
  return Object.freeze({
    execute: (characterCardId, slot, itemCardId) => {
      const normalizedSlot = Math.trunc(Number(slot));
      if (!Number.isInteger(normalizedSlot) || normalizedSlot < 1 || normalizedSlot > 2) {
        throw invalid('INVALID_EQUIPMENT_SLOT');
      }
      return repository.equipItem(
        requiredId(characterCardId, 'CHARACTER_CARD_REQUIRED'),
        normalizedSlot,
        requiredId(itemCardId, 'ITEM_CARD_REQUIRED')
      );
    },
  });
}

export function createUnequipItemUseCase(repository) {
  return Object.freeze({
    execute: (characterCardId, slot) => {
      const normalizedSlot = Math.trunc(Number(slot));
      if (!Number.isInteger(normalizedSlot) || normalizedSlot < 1 || normalizedSlot > 2) {
        throw invalid('INVALID_EQUIPMENT_SLOT');
      }
      return repository.unequipItem(
        requiredId(characterCardId, 'CHARACTER_CARD_REQUIRED'),
        normalizedSlot
      );
    },
  });
}
