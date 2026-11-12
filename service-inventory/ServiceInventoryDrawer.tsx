import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Drawer } from '@mantine/core';
import { appUrlPrefix } from '@/_common/_constants';
import { DrawerDetailHead } from '@/components/display/DetailDrawerSkelaton/Head';
import { DrawerDetailBody } from '@/components/display/DetailDrawerSkelaton';
import drawerClasses from '@/components/display/DetailDrawerSkelaton/style.module.scss';
import { CatalogShell } from './catalog/CatalogShell';

const DRAWER_OVERLAY_PROPS = { backgroundOpacity: 0.2, blur: 4 };
const SERVICE_INVENTORY_DRAWER_CLASS_NAMES = {
  ...drawerClasses,
  root: drawerClasses.responsiveServiceInventoryRoot,
  content: `${drawerClasses.content} ${drawerClasses.responsiveContent}`,
  body: `${drawerClasses.body} ${drawerClasses.responsiveBody}`,
};

export const ServiceInventoryDrawer = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const onClose = () => navigate(`${appUrlPrefix}/home`, { replace: true });

  return (
    <Drawer
      data-testid="service-inventory-drawer"
      size="var(--detail-drawer-size)"
      radius={14}
      lockScroll
      position="right"
      opened
      overlayProps={DRAWER_OVERLAY_PROPS}
      onClose={onClose}
      withCloseButton={false}
      closeOnClickOutside={false}
      classNames={SERVICE_INVENTORY_DRAWER_CLASS_NAMES}
      offset={10}
    >
      <DrawerDetailHead closeButtonAriaLabel={t('label.serviceInventory.close')} onClose={onClose}>
        Servis Kataloğu
      </DrawerDetailHead>
      <DrawerDetailBody>
        <CatalogShell />
      </DrawerDetailBody>
    </Drawer>
  );
};
