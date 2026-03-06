import { useMemo } from 'react';
import type { Module } from '@shared/schema';

export function useProgress(modules: Module[], completedModules: number[]) {
    const unlockedModules = useMemo(() => {
        if (!modules.length) return new Set<number>();
        const unlocked = new Set<number>();

        // Group modules by subjectId to calculate sequence properly within each subject
        const modulesBySubject = modules.reduce((acc, module) => {
            if (!acc[module.subjectId]) acc[module.subjectId] = [];
            acc[module.subjectId].push(module);
            return acc;
        }, {} as Record<number, Module[]>);

        Object.values(modulesBySubject).forEach(subjectModules => {
            // Sort modules by moduleNumber (represents learning sequence)
            const sortedModules = [...subjectModules].sort((a, b) => a.moduleNumber - b.moduleNumber);

            // First module of any subject is always unlocked
            if (sortedModules.length > 0) {
                unlocked.add(sortedModules[0].id);
            }

            // Unlock subsequent modules if previous ones within the same subject are completed
            for (let i = 1; i < sortedModules.length; i++) {
                const previousModule = sortedModules[i - 1];
                if (completedModules.includes(previousModule.id)) {
                    unlocked.add(sortedModules[i].id);
                }
            }
        });

        return unlocked;
    }, [modules, completedModules]);

    const totalModules = modules.length;
    const overallProgress = totalModules > 0 ? Math.round((completedModules.length / totalModules) * 100) : 0;

    return { unlockedModules, overallProgress, totalModules };
}
