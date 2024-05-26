import * as cheerio from "cheerio";

export type SpotifyTrack = {
  uri: string;
  uid: string;
  title: string;
  subtitle: string;
};

export type SpotifyPlaylist = {
  type: string;
  name: string;
  uri: string;
  id: string;
  trackList: Array<SpotifyTrack>;
};

export type SpotifyEmbedPageProps = {
  props?: {
    pageProps?: {
      state?: {
        data?: {
          entity?: SpotifyPlaylist;
        };
      };
    };
  };
};

function getPlaylistId(url: string): string | null {
  const regex =
    /https:\/\/open\.spotify\.com\/(?:embed\/)?playlist\/([a-zA-Z0-9]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function escape(value: string) {
  const escaped = String(value).replace(/"/g, '""');
  return `"${escaped}"`;
}

async function fetchPlaylist(playlistId: string): Promise<SpotifyPlaylist> {
  const html = await fetchHtml(
    `https://open.spotify.com/embed/playlist/${playlistId}`
  );

  const $ = cheerio.load(html);
  const script = $("script#__NEXT_DATA__").html() ?? "";
  const data = JSON.parse(script) as SpotifyEmbedPageProps;

  if (data?.props?.pageProps?.state?.data?.entity) {
    return data.props.pageProps.state.data.entity;
  }

  throw new Error(
    `Can't find valid <script id="__NEXT_DATA__"> on page. Please check https://open.spotify.com/embed/playlist/${playlistId}`
  );
}

async function fetchHtml(url: string) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(res.statusText);
  }

  return res.text();
}

async function main() {
  const playlistUrl = process.argv[2] ?? "";

  const playlistId = getPlaylistId(playlistUrl);
  if (!playlistId) {
    process.stderr.write(
      `Please provide a valid Spotify URL, e.g., https://open.spotify.com/playlist/...\n`
    );
    process.exit(2);
  }

  try {
    const playlist = await fetchPlaylist(playlistId);

    const rows = [
      ["Name", "Artist"].join(","),
      ...playlist.trackList.map((track) =>
        [escape(track.title), escape(track.subtitle)].join(",")
      ),
    ];

    // Write CSV to stdout
    process.stdout.write(rows.join("\n"));
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exit(2);
  }
}

main();
