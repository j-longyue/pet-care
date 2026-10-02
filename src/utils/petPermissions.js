const accessFlag = (pet, name) => pet[`access_${name}`] === true;

const resolvePetPermissions = (pet, user) => {
  const isAdmin = user?.role === 'adm';
  const isOwner = pet.created_by != null && Number(pet.created_by) === Number(user?.id);

  if (pet.deleted_at) {
    return { isAdmin, isOwner, canView: isAdmin, canCreate: false, canEdit: false, canDelete: false };
  }

  const sharedView = accessFlag(pet, 'can_view');

  return {
    isAdmin,
    isOwner,
    canView: isAdmin || isOwner || sharedView,
    canCreate: isOwner || (sharedView && accessFlag(pet, 'can_create')),
    canEdit: isOwner || (sharedView && accessFlag(pet, 'can_edit')),
    canDelete: isOwner || (sharedView && accessFlag(pet, 'can_delete')),
  };
};

module.exports = { resolvePetPermissions };