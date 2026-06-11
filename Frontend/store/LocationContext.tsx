import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    type ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LatLng {
    lat: number;
    lng: number;
}

export interface LocationEntry {
    address: string;
    coords: LatLng | null;
}

interface LocationContextValue {
    pickup: LocationEntry;
    drop: LocationEntry;
    setPickup: (entry: LocationEntry) => void;
    setDrop: (entry: LocationEntry) => void;
    clearLocations: () => void;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const EMPTY: LocationEntry = { address: "", coords: null };

const defaultValue: LocationContextValue = {
    pickup: EMPTY,
    drop: EMPTY,
    setPickup: () => {},
    setDrop: () => {},
    clearLocations: () => {},
};

// ─── Context ─────────────────────────────────────────────────────────────────

const LocationContext = createContext<LocationContextValue>(defaultValue);

// ─── Provider ────────────────────────────────────────────────────────────────

export function LocationProvider({ children }: { children: ReactNode }) {
    const [pickup, setPickupState] = useState<LocationEntry>(EMPTY);
    const [drop, setDropState] = useState<LocationEntry>(EMPTY);

    const setPickup = useCallback((entry: LocationEntry) => {
        setPickupState(entry);
    }, []);

    const setDrop = useCallback((entry: LocationEntry) => {
        setDropState(entry);
    }, []);

    const clearLocations = useCallback(() => {
        setPickupState(EMPTY);
        setDropState(EMPTY);
    }, []);

    return (
        <LocationContext.Provider
            value={{ pickup, drop, setPickup, setDrop, clearLocations }}
        >
            {children}
        </LocationContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLocation(): LocationContextValue {
    return useContext(LocationContext);
}
