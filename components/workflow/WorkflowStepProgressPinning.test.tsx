import { act, Fragment, StrictMode, type ComponentProps } from 'react';
import { createInstance } from 'i18next';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider, rem } from '@mantine/core';
import { TASK_WORKFLOW_STEP_BADGE_COLOR } from '@/_common/tasks/presentation';
import { label as enLabels } from '@/_i18n/En/_label';
import { label as trLabels } from '@/_i18n/Tr/_label';
import { useWorkflowPreferencesStore as store } from '@/_store/workflow/useWorkflowPreferencesStore';
import { WorkflowStepProgress } from './WorkflowStepProgress';
import { WorkflowWorkStartButton } from './WorkflowWorkStartButton';

describe('shared workflow pin control', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let i18n: ReturnType<typeof createInstance>;
  const scrollTo = vi.fn();
  const previousScrollTo = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo');

  const render = (
    userIdentity = 'id:user-a',
    withWorkStart = false,
    strict = false,
    workflowProps: Partial<ComponentProps<typeof WorkflowStepProgress>> = {}
  ) => {
    const RenderMode = strict ? StrictMode : Fragment;
    const currentStepAction = withWorkStart ? (
      <WorkflowWorkStartButton onClick={vi.fn()} />
    ) : undefined;
    act(() =>
      root.render(
        <RenderMode>
          <I18nextProvider i18n={i18n}>
            <MantineProvider env="test">
              <WorkflowStepProgress
                currentStepAction={currentStepAction}
                currentStepName="Talep"
                userIdentity={userIdentity}
                withSla={false}
                {...workflowProps}
              />
              <WorkflowStepProgress
                currentStepAction={currentStepAction}
                color={TASK_WORKFLOW_STEP_BADGE_COLOR}
                currentStepName="Görev"
                userIdentity={userIdentity}
                withSla={false}
                {...workflowProps}
              />
            </MantineProvider>
          </I18nextProvider>
        </RenderMode>
      )
    );
  };
  const controls = () =>
    Array.from(container.querySelectorAll<HTMLButtonElement>('button[aria-pressed]'));
  const bands = () =>
    Array.from(container.querySelectorAll<HTMLElement>('[data-testid="workflow-step-progress"]'));

  beforeEach(async () => {
    store.setState({ pinnedByUser: {} });
    store.persist.clearStorage();
    scrollTo.mockClear();
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });
    i18n = createInstance();
    await i18n.init({
      lng: 'tr',
      fallbackLng: false,
      resources: structuredClone({ tr: { translation: trLabels }, en: { translation: enLabels } }),
      react: { useSuspense: false },
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    store.persist.clearStorage();
    if (previousScrollTo) {
      Object.defineProperty(HTMLElement.prototype, 'scrollTo', previousScrollTo);
    } else {
      delete (HTMLElement.prototype as Partial<HTMLElement>).scrollTo;
    }
  });

  it('uses a shared ActionIcon toggle with a pressed state and localized labels', async () => {
    render();
    expect(controls()).toHaveLength(2);
    expect(controls()[0].className).toContain('mantine-ActionIcon-root');
    expect(controls()[0].getAttribute('type')).toBe('button');
    expect(controls()[0].getAttribute('aria-label')).toBe('Sabitle');
    expect(controls()[0].querySelector('.tabler-icon-pin')).not.toBeNull();
    expect(controls()[0].getAttribute('data-variant')).toBe('light');
    act(() => controls()[0].click());

    expect(
      bands().every((band) => band.dataset.expanded === 'true' && band.dataset.pinned === 'true')
    ).toBe(true);
    expect(controls().every((button) => button.getAttribute('aria-pressed') === 'true')).toBe(true);
    expect(controls()[1].getAttribute('aria-label')).toBe('Sabitlemeyi kaldır');
    expect(controls()[1].querySelector('.tabler-icon-pinned-off')).not.toBeNull();
    expect(controls()[1].getAttribute('data-variant')).toBe('light');
    const indicator = controls()[1].closest<HTMLElement>('.mantine-Indicator-root');
    expect(indicator?.style.getPropertyValue('--indicator-top')).toBe(rem(3));
    expect(indicator?.style.getPropertyValue('--indicator-right')).toBe(rem(3));
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    expect(controls()[0].getAttribute('aria-label')).toBe('Unpin');

    act(() => controls()[1].click());
    expect(bands().every((band) => !band.dataset.expanded && !band.dataset.pinned)).toBe(true);
    expect(controls()[0].getAttribute('aria-label')).toBe('Pin');
    expect(controls()[0].querySelector('.tabler-icon-pin')).not.toBeNull();
  });

  it('opens both views pinned immediately on remount and isolates another account', () => {
    store.getState().setPinned('id:user-a', true);
    render();
    expect(bands().every((band) => band.dataset.pinned === 'true')).toBe(true);
    expect(scrollTo).toHaveBeenCalledTimes(2);
    expect(scrollTo).toHaveBeenLastCalledWith({ behavior: 'instant', left: 0 });
    act(() => root.render(null));
    render();
    expect(bands().every((band) => band.dataset.expanded === 'true')).toBe(true);
    render('id:user-b');
    expect(bands().every((band) => !band.dataset.pinned)).toBe(true);
    render('id:user-a');
    expect(bands().every((band) => band.dataset.pinned === 'true')).toBe(true);
  });

  it('matches each pin indicator to its active workflow step color', () => {
    store.getState().setPinned('id:user-a', true);
    render();

    const colors = ['cyan', TASK_WORKFLOW_STEP_BADGE_COLOR];
    controls().forEach((button, index) => {
      const indicator = button.closest<HTMLElement>('.mantine-Indicator-root');
      const activeColor = bands()[index].style.getPropertyValue('--workflow-progress-active');

      expect(activeColor).toBe(`var(--mantine-color-${colors[index]}-8)`);
      expect(indicator?.style.getPropertyValue('--indicator-color')).toBe(activeColor);
      expect(button.hasAttribute('indicatorColor')).toBe(false);
    });
  });

  it('does not recenter a pinned view when the pointer enters again', () => {
    store.getState().setPinned('id:user-a', true);
    render();
    scrollTo.mockClear();
    act(() => bands()[0].dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('preserves position on rerender and repositions only when the active step changes', () => {
    store.getState().setPinned('id:user-a', true);
    const steps = [
      { Code: 'First', Name: 'İlk adım', Order: 1 },
      { Code: 'Second', Name: 'Sonraki adım', Order: 2 },
    ];
    const firstStep = {
      currentStepCode: 'First',
      currentStepName: 'İlk adım',
      currentStepOrder: 1,
      stepDefinitions: steps,
    };
    render('id:user-a', false, false, firstStep);
    scrollTo.mockClear();
    const initialBands = bands();
    render('id:user-a', false, false, { ...firstStep });
    expect(bands()[0]).toBe(initialBands[0]);
    expect(scrollTo).not.toHaveBeenCalled();

    render('id:user-a', false, false, {
      ...firstStep,
      currentStepCode: 'Second',
      currentStepName: 'Sonraki adım',
      currentStepOrder: 2,
      timelineItems: [
        {
          key: 'first-approved',
          date: '30 Eki 2026, 12:00',
          stepDefinitionName: 'İlk adım',
          statusColor: 'green',
          statusLabel: 'Onaylandı',
          statusValue: 2,
          card: { kind: 'person', title: 'Onaycı', subtitle: 'Birim' },
        },
      ],
    });
    expect(bands()[0]).toBe(initialBands[0]);
    expect(scrollTo).toHaveBeenCalledTimes(2);
    expect(scrollTo).toHaveBeenLastCalledWith({ behavior: 'instant', left: 0 });
  });

  it('scrolls on hover or external keyboard focus, not between controls inside the band', () => {
    render();
    act(() => bands()[0].dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
    expect(scrollTo).toHaveBeenLastCalledWith({ behavior: 'smooth', left: 0 });
    scrollTo.mockClear();
    act(() => bands()[0].querySelector<HTMLElement>('[role="img"]')!.focus());
    expect(scrollTo).toHaveBeenCalledOnce();
    expect(scrollTo).toHaveBeenLastCalledWith({ behavior: 'smooth', left: 0 });
    scrollTo.mockClear();
    act(() => controls()[0].focus());
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'auto-pins both views once and allows unpinning while the action remains visible (%s)',
    (pinned) => {
      store.getState().setPinned('id:user-a', pinned);
      render('id:user-a', true);
      const preferences = store.getState().pinnedByUser;

      expect(container.querySelectorAll('[data-testid="workflow-work-start"]')).toHaveLength(2);
      expect(bands().every((band) => band.dataset.expanded === 'true')).toBe(true);
      expect(controls().every((button) => button.getAttribute('aria-pressed') === 'true')).toBe(
        true
      );
      expect(store.getState().pinnedByUser['id:user-a']).toBe(true);
      expect(scrollTo).toHaveBeenCalledTimes(2);
      scrollTo.mockClear();

      act(() => {
        bands()[0].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        bands()[0].dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      });
      render('id:user-a', true);
      expect(bands().every((band) => band.dataset.expanded === 'true')).toBe(true);
      expect(scrollTo).not.toHaveBeenCalled();
      expect(store.getState().pinnedByUser).toBe(preferences);

      act(() => controls()[0].click());
      expect(store.getState().pinnedByUser['id:user-a']).toBe(false);
      expect(bands().every((band) => !band.dataset.expanded && !band.dataset.pinned)).toBe(true);
      render('id:user-a', true);
      expect(bands().every((band) => !band.dataset.expanded)).toBe(true);
      expect(container.querySelectorAll('[data-testid="workflow-work-start"]')).toHaveLength(2);

      render('id:user-a');
      render('id:user-a', true);
      expect(bands().every((band) => !band.dataset.expanded)).toBe(true);
      act(() => bands()[0].dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
      expect(scrollTo).toHaveBeenCalledOnce();

      act(() => controls()[1].click());
      expect(bands().every((band) => band.dataset.pinned === 'true')).toBe(true);
    }
  );

  it('auto-pins again only when a new drawer opens', () => {
    render('id:user-a', true);
    act(() => controls()[0].click());
    expect(store.getState().pinnedByUser['id:user-a']).toBe(false);
    expect(bands().every((band) => !band.dataset.expanded)).toBe(true);
    act(() => root.render(null));
    render('id:user-a', true);
    expect(bands().every((band) => band.dataset.pinned === 'true')).toBe(true);
  });

  it('writes the auto-pin preference only once under StrictMode and does not override unpinning', () => {
    const changed = vi.fn();
    const unsubscribe = store.subscribe(changed);
    try {
      render('id:user-a', true, true);
      expect(changed).toHaveBeenCalledOnce();
      render('id:user-a', true, true);
      expect(changed).toHaveBeenCalledOnce();

      act(() => controls()[0].click());
      expect(changed).toHaveBeenCalledTimes(2);
      render('id:user-a', true, true);
      expect(changed).toHaveBeenCalledTimes(2);
      expect(bands().every((band) => !band.dataset.pinned)).toBe(true);
    } finally {
      unsubscribe();
    }
  });

  it('preserves manual choices made before action data arrives', () => {
    render('id:user-a');
    act(() => controls()[0].click());
    act(() => controls()[1].click());
    render('id:user-a', true);
    expect(store.getState().pinnedByUser['id:user-a']).toBe(false);
    expect(bands().every((band) => !band.dataset.expanded)).toBe(true);
  });

  it('releases pointer focus when unpinning but preserves keyboard focus', () => {
    render();
    act(() => controls()[0].click());
    act(() => controls()[0].focus());
    act(() => controls()[0].dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })));
    expect(document.activeElement).not.toBe(controls()[0]);

    act(() => controls()[0].click());
    act(() => controls()[0].focus());
    act(() => controls()[0].click());
    expect(document.activeElement).toBe(controls()[0]);
    expect(controls()[0].getAttribute('aria-pressed')).toBe('false');
  });

  it('does not expose a persistent toggle without a user identity', () => {
    render('');
    expect(controls()).toHaveLength(0);
    expect(store.getState().pinnedByUser).toEqual({});
  });
});
