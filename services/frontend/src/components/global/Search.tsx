import { SearchIcon } from "@heroicons/react/solid";

interface ISearchProps {
  onSearchChange: any;
}

const Search = (props: ISearchProps) => {
  const { onSearchChange } = props;

  return (
    <div className="flex-1 flex">
      <form className="w-full flex md:ml-0" autoComplete="off" method="post" action="">
        <input autoComplete="false" name="hidden" type="text" className="hidden" />
        <label htmlFor="search-field" className="sr-only">
          Search
        </label>
        <div className="relative w-full text-gray-400 focus-within:text-gray-400">
          <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <input
            id="search-field"
            className="dark:bg-gray-800 block w-full h-full pl-8 pr-3 py-2 border-transparent dark:text-white text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent sm:text-sm"
            placeholder="Search"
            type="input"
            name="search"
            onChange={onSearchChange}
          />
        </div>
      </form>
    </div>
  ) 
}

export default Search;
