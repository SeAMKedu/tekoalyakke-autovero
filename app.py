from sklearn import linear_model

from flask import Flask, render_template, jsonify
import pandas as pd
import numpy as np

from tqdm import tqdm
import math
import os
import argparse


app = Flask(__name__)
df = []


def stripHeaders(df):
    ''' Strip the swedish header off the file '''
    if not df.empty:
        df = df.loc[df["Merkki"] != "Märke"]

    return df


def importData(path, pickleTarget):
    sheets = ['Tammikuu_Januari', 'Helmikuu_Februari', 'Maaliskuu_Mars', 'Huhtikuu_April', 'Toukokuu_Maj', 'Kesäkuu_Juni', 'Heinäkuu_Juli', 'Elokuu_Augusti', 'Syyskuu_September', 'Lokakuu_Oktober', 'Marraskuu_November', 'Joulukuu_December']
    sheets_dash = ['Tammikuu-Januari', 'Helmikuu-Februari', 'Maaliskuu-Mars', 'Huhtikuu-April', 'Toukokuu-Maj', 'Kesäkuu-Juni', 'Heinäkuu-Juli', 'Elokuu-Augusti', 'Syyskuu-September', 'Lokakuu-Oktober', 'Marraskuu-November', 'Joulukuu-December']

    df = pd.DataFrame()

    pbar = tqdm(os.listdir(path), unit_scale=False, miniters=0, ascii=True)

    # go through the files in given directory 
    for file in pbar:
        filepath = os.path.join(path, file)
        pbar.set_description(f"Reading {filepath:32s}")
        # assume every file is an excel with same structure    
        excel = pd.read_excel(filepath, None, na_values='')
        # read each monthly sheet in
        if "_" in list(excel.keys())[1]:
            frames = [stripHeaders(excel[s]) for s in sheets] 
        else:
            frames = [stripHeaders(excel[s]) for s in sheets_dash] 

        # append the sheet contents to single dataframe
        frames = pd.concat(frames)
        df = pd.concat([df, frames])

    # rename columns to simpler
    df.rename(columns={"Kunto A=Alennettu": "Kunto", "Ajokm/1000": "Mittarilukema"}, inplace=True)

    dateColumns = ["Päätöspäivä", "Ensirekisteröintipäivä"]
    strColumns = ["Merkki", "Malli", "Mallin tarkennin", "Kunto", "Käyttövoima"]

    # convert to datetime
    for c in dateColumns:
        df[c] = df[c].astype(str) # force to strings
        df[c] = df[c].str[:8]     # only take eigth first letters YYYYmmdd
        df[c] = pd.to_datetime(df[c], format="%Y%m%d", errors = 'coerce') # handle errors, data contains oddities
        df[c] = df[c].dt.date     # only use date part
        #df[c] = df[c].notna()

    # convert to lowercase
    for c in strColumns:
        df[c] = df[c].astype(str)
        df[c] = df[c].str.lower()

    # merge renamed columns and drop the other variant
    df["Mittarilukema"].replace('\.\d+', '', regex=True, inplace=True)
    df["Mittarilukema"].replace('\,\d+', '', regex=True, inplace=True)
    df["Mittarilukema"].replace(' ', np.nan, regex=True, inplace=True)
    df["Mittarilukema"].replace('', np.nan, regex=True, inplace=True)
    df["Mittarilukema"].replace(r'^\s*$', np.nan, regex=True, inplace=True)
    df["Mittarilukema"].fillna(0.0, inplace=True)
    df["Mittarilukema"] = df["Mittarilukema"].astype(int)

    df["Cm3"].fillna(0, inplace=True)
    df["Kw"].fillna(0, inplace=True)
    df["Kw"] = df["Kw"].replace({'nan': 0})
    df["Kw"] = df["Kw"].astype(int)

    df["Kunto"] = df["Kunto"].fillna('n')
    df["Kunto"] = df["Kunto"].replace({'nan': 'n'})

    # convert letter values to numbers
    codes, uniques = pd.factorize(df["Kunto"].to_list(), sort=True)
    df["Kunto"] = codes

    # drop rows missing either make, model, taxation date or mileage
    df.dropna(subset=["Merkki", "Malli", "Päätöspäivä", "Mittarilukema"], inplace=True)
    
    # drop rows with a make and model that only appear once
    df = df[df.groupby(["Merkki", "Malli"])["Merkki"].transform('size') > 1]

    # drop rows with a make that only appear rarely
    df = df[df.groupby(["Merkki"])["Merkki"].transform('size') > 5]
    
    # calculate tax percentage
    df["Veroprosentti"] = df.apply(lambda row : (row["Autovero"] / row["Verotusarvo"]) * 100 if row["Verotusarvo"] != 0 else 0.0, axis=1)

    # calculate total value 
    df["Arvo"] = df["Verotusarvo"] + df["Autovero"]

    # calculate weight for row based on taxation date
    earliestDate = df["Päätöspäivä"].min()
    latestDate = df["Päätöspäivä"].max()

    # sigmoid with normalize dates
    a = -0.75   # shift sigmoid, larger negative moves it right
    k = 0.1     # adjust rate of change of sigmoid
    df["NormAge"] = df.apply(lambda row : (row["Päätöspäivä"] - earliestDate).days / (latestDate - earliestDate).days, axis=1)
    df["Weight"] = df.apply(lambda row : 1 / (1 + math.exp(-(row["NormAge"] + a) / k)), axis=1)


    df["Vuosimalli"] = df.apply(lambda row : row["Ensirekisteröintipäivä"].year, axis=1)
    df["Vuosimalli"] = df["Vuosimalli"].astype("Int64")

    df["Ikä"] = (df["Päätöspäivä"] - df["Ensirekisteröintipäivä"]).dt.days
    df["Ikä"] = df["Ikä"].astype("Int64")
    #df["Ikä"] = df["Ikä"].fillna(0)
    df = df.dropna(axis=0, subset=["Ikä"])

    # select interesting columns and sort by taxation date
    export = df[["Merkki", "Malli", "Vuosimalli", "Mittarilukema", "Kunto", "Ensirekisteröintipäivä", "Päätöspäivä", "Ikä", "Verotusarvo", "Autovero", "Arvo", "Veroprosentti", "Weight", "Cm3", "Kw"]]
    export = export.sort_values(by=["Päätöspäivä"])
    export.reset_index(drop=True, inplace=True)

    # save to pickle 
    export.to_pickle(pickleTarget)


def loadData(pickleTarget):
    df = pd.read_pickle(pickleTarget)
    return df
    

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/make")
def list_makes():
    makes = sorted(df["Merkki"].unique().tolist())
    return jsonify(makes)


@app.route("/api/make/<make>/models")
def list_models(make):
    models = sorted(df[df["Merkki"] == make]["Malli"].unique().tolist())

    return jsonify(models)


@app.route("/api/entries/<make>/<model>")
def list_entries(make, model):
    entries =  df[((df["Merkki"] == make) & (df["Malli"] == model))].reset_index()
    return entries.to_json(orient="records")


@app.route("/api/coeffs/<make>/<model>")
def get_coeffs(make, model):
    data = df[((df["Merkki"] == make) & (df["Malli"] == model))]
    # exclude outliers
    q = data["Mittarilukema"].quantile(0.99)
    data = data[data["Mittarilukema"] < q]
    # not using testing for validation, so commented out
    #splitIdx = int(data.shape[0] * 0.9)
    #training = data[:-(data.shape[0] - splitIdx)]
    columns = ["Mittarilukema", "Ikä", "Kw"]
    train = data[columns].values

    regr = linear_model.LinearRegression()
    regr.fit(train, data["Verotusarvo"], sample_weight=data["Weight"])

    return jsonify([regr.coef_.tolist(), regr.intercept_])


def setupParser():
    parser = argparse.ArgumentParser(description="Car tax visualization")
    parser.add_argument("--port", type=int, default=5555, nargs='?', help="HTTP server port")
    parser.add_argument("--pickleFile", default="taxdata.pkl", nargs='?', help="Pickle file")
    parser.add_argument("data", default="data", nargs='?', help="Path to taxation excels")

    return parser

if __name__ == '__main__':
    args = setupParser().parse_args()

    importData(args.data, args.pickleFile)
    df = loadData(args.pickleFile).reset_index(drop=True)

    app.run(port=args.port, debug = False)