interface IpInfoResponse {
    ip: string;
    city?: string;
    region?: string;
    country?: string;
    loc?: string;
    org?: string;
    timezone?: string;
    postal?: string;
}

interface GeoLocation {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
    isp?: string;
    lat?: number;
    lon?: number;
    postal?: string;
}

export async function getGeoLocation(ip: string): Promise<GeoLocation> {
    const token = process.env.IPINFO_API_TOKEN;
    return getGeoLocationWithToken(ip, token);
}

export async function getGeoLocationWithToken(ip: string, token?: string): Promise<GeoLocation> {
    try {
        if (isPrivateIP(ip)) {
            return getLocalGeoData();
        }

        const url = token
            ? `https://ipinfo.io/${ip}?token=${token}`
            : `https://ipinfo.io/${ip}/json`;

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'UniAI-Platform/1.0'
            },
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data: IpInfoResponse = await response.json();

        let lat: number | undefined;
        let lon: number | undefined;
        if (data.loc) {
            const [latitude, longitude] = data.loc.split(',').map(Number);
            lat = latitude;
            lon = longitude;
        }

        return {
            country: data.country || 'Unknown',
            region: data.region || 'Unknown',
            city: data.city || 'Unknown',
            timezone: data.timezone || 'Unknown',
            isp: data.org || 'Unknown',
            lat,
            lon,
            postal: data.postal,
        };
    } catch (error) {
        console.warn('ipinfo.io geolocation lookup failed:', error);
        return getUnknownGeoData();
    }
}

function isPrivateIP(ip: string): boolean {
    if (!ip || ip === 'unknown') return true;

    const privateRanges = [
        /^127\./, // Loopback
        /^192\.168\./, // Private Class C
        /^10\./, // Private Class A
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B
        /^::1$/, // IPv6 loopback
        /^fc00:/, // IPv6 private
    ];

    return privateRanges.some(range => range.test(ip));
}

function getLocalGeoData(): GeoLocation {
    return {
        country: 'Local Network',
        region: 'Private',
        city: 'Private',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        isp: 'Local Network'
    };
}

function getUnknownGeoData(): GeoLocation {
    return {
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        timezone: 'Unknown',
        isp: 'Unknown'
    };
}